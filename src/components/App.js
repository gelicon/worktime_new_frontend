import React from 'react';
import { useHistory } from "react-router-dom";

import '../resources/css/App.css';

import 'antd/dist/antd.css';
import { Layout, Menu, Button, Popover, Form, Drawer } from 'antd';
import {
    UserOutlined, AppstoreOutlined, LogoutOutlined,
    MenuOutlined, CloseOutlined, BankOutlined, ShopOutlined
} from '@ant-design/icons';
import { Link } from "react-router-dom";
import requestToAPI from "./lib/Request";
import { logout, restoreToken, userProps } from "./lib/LoginForm";
import logo from '../resources/images/logo.png';
import teg from '../resources/images/teg.png';
import {
    MODULE_CREDENTIAL, 
    MODULE_EDIZM, 
    CONTOURS_WITH_MODULES, CONTOUR_ADMIN, MODULES, CONTOUR_REFBOOKS,
    MODULE_ORGSTRUCT
} from "./lib/ModuleConst";
import { ChangePasswordForm } from "./lib/ChangePasswordForm";
import { ShowModal } from "./lib/EditForm";
import { buildURL, buildMobileButtons, getItemFromLocalStorage } from "./lib/Utils";

import { DesktopOrTabletScreen, MobileScreen, setMobile } from './lib/Responsive'
import { useMediaQuery } from 'react-responsive'

const CONTOUR = CONTOUR_ADMIN;
const MODULE = MODULE_CREDENTIAL;
const ENTITY = "Proguser";

const URI_FOR_CHANGE_PSWD = buildURL(CONTOUR, MODULE, ENTITY) + "/changepswd";

const { SubMenu } = Menu;
const { Content, Sider } = Layout;

// здесь левое меню, в зависимости от subsystem
const getSubMenu = (sys, clsMenuName) => {
    // Получим список всех модулей выбранного контура
    console.log("Контур=", sys);
    let allModules = [];
    CONTOURS_WITH_MODULES.forEach((value, key) => {
        if (key.name === sys) {
            allModules.push(...value);
        }
    });
    console.log("Все модули контура=", allModules);
    // Получим список всех доступных пользовтелю модулей
    const applicationList = getItemFromLocalStorage("modules");
    //console.log("applicationList=", applicationList);
    const modules = (JSON.parse(applicationList) ?? []).map(value => value.applicationExe.toLowerCase());
    console.log("modules=", modules);
    // Отфильтруем список модулей контура так, чтобы остались только доступные пользователю модули контура
    const allowModules = allModules.filter(value => modules.indexOf(value.name) !== -1);
    console.log("Доступные пользователю модули=", allowModules);

    const clsmmenu = clsMenuName || "main-menu";

    let menuItems = []; // Корневое меню
    let menuItemsRefbooks = []; // Меню Справочники
    let menuItemsAdmin = []; // Меню Администрирование
    allowModules.forEach(value => {
        switch (value.name) {
            case MODULE_EDIZM.name:
                menuItemsRefbooks.push(
                    <Menu.Item className={clsmmenu} key={MODULE_EDIZM.name} icon={<AppstoreOutlined />}>
                        <Link to="/edizm">{MODULE_EDIZM.title}</Link>
                    </Menu.Item>
                );
                break;
            case MODULE_ORGSTRUCT.name:
                menuItemsRefbooks.push(
                    <SubMenu className={clsmmenu} key={MODULE_ORGSTRUCT.name} title={MODULE_ORGSTRUCT.title}>
                        <Menu.Item key={MODULE_ORGSTRUCT.name + ".department"} >
                            <Link to="/department">Отделы</Link>
                        </Menu.Item>
                    </SubMenu>
                );
                break;
            case MODULE_CREDENTIAL.name:
            menuItemsAdmin.push(
                <SubMenu className={clsmmenu} key={MODULE_CREDENTIAL.name} title={MODULE_CREDENTIAL.title}>
                    <Menu.Item key={MODULE_CREDENTIAL.name + ".progusergroup"} >
                        <Link to="/progusergroup">Группы пользователей</Link>
                    </Menu.Item>
                    <Menu.Item key={MODULE_CREDENTIAL.name + ".proguser"} >
                        <Link to="/proguser">Пользователи</Link>
                    </Menu.Item>
                    <Menu.Item key={MODULE_CREDENTIAL.name + ".accessrole"} >
                        <Link to="/accessrole">Роли доступа</Link>
                    </Menu.Item>
                    <Menu.Item key={MODULE_CREDENTIAL.name + ".controlobjectrole"} >
                        <Link to="/controlobject">Права ролей</Link>
                    </Menu.Item>
                    <Menu.Item key={MODULE_CREDENTIAL.name + ".applicationrole"} >
                        <Link to="/applicationrole">Доступ ролей к модулям</Link>
                    </Menu.Item>
                </SubMenu>
                );
                break;
            default:
        }
    });
    // Засунем меню в подменю контура
    if (menuItemsRefbooks.length > 0) {
        menuItems.push(
            <SubMenu key={CONTOUR_REFBOOKS.name} title={CONTOUR_REFBOOKS.title} icon={CONTOUR_REFBOOKS.icon}>
                {menuItemsRefbooks}
            </SubMenu>
        );
    }
    if (menuItemsAdmin.length > 0) {
        menuItems.push(
            <SubMenu key={CONTOUR_ADMIN.name} title={CONTOUR_ADMIN.title} icon={CONTOUR_ADMIN.icon}>
                {menuItemsAdmin}
            </SubMenu>
        );
    }
    
    return menuItems;
}

const getUserInfo = () => (
    <span className="text-span-1">
        <Button className="user-dropdown-login" shape="circle" icon={<UserOutlined />} /> <span className="user-text-span">{requestToAPI.user ? requestToAPI.user.name : "(нет)"}</span>
    </span>);

let startFlag = false;

const App = (props) => {
    const [form] = Form.useForm();
    const [topLayer, setTopLayer] = React.useState([]);
    var [collapsed, setCollapse] = React.useState(props.defaultCollapsed);
    var [visibleUserPopover, setVisibleUserPopover] = React.useState(false);
    const [visibleMobileMenu, setVisibleMobileMenu] = React.useState(false);

    const history = useHistory();

    if (!startFlag) {
        restoreToken();
    }

    React.useEffect(() => {
        if (!startFlag) {
            if (!requestToAPI.token) {
                history.push("/");
            }
            startFlag = true;
        }
    });

    const changePassword = () => {
        setVisibleUserPopover(false);
        // тут можно размещать url для сохранения и загрузки
        // формируем диалог
        const dialog = ShowModal({
            form: form,
            title: "Сменить пароль пользователя",
            content: <ChangePasswordForm />,
            width: 688,
            editorContext: { id: requestToAPI.user.name, uriForSave: URI_FOR_CHANGE_PSWD },
            idName: "userName",
            destroyDialog: (dlgId) => {
                form.resetFields();
                setTopLayer([...topLayer.filter(c => c.props.id != dlgId)]);
            },
        });
        // вставляем Modal в top layer
        setTopLayer([dialog]);
    }

    const logoutCB = React.useCallback(() => {
        setVisibleUserPopover(false);
        logout(history, props.afterLogout);
    }, [setVisibleUserPopover, history, props.afterLogout])

    const userTitle = React.useCallback(() => {
        if (!requestToAPI.user) {
            return undefined;
        }
        return (
            <>
                <div style={{ padding: 16 }}>
                    <UserOutlined />
                    <span style={{ marginLeft: 8 }}>{requestToAPI.user.name}</span>
                </div>
                {(userProps && userProps.subject) ?
                    <div style={{ padding: 16, paddingTop: 8 }}>
                        <BankOutlined title="СЦ/ФСЦ, связанная с пользователем " />
                        <span style={{ marginLeft: 8 }}>{userProps.subject.subjectName}</span>
                    </div>
                    : ""}
                {(userProps && userProps.parent) ?
                    <div style={{ padding: 16, paddingTop: 8 }}>
                        <ShopOutlined title="Поставщик по умолчанию" />
                        <span style={{ marginLeft: 8 }}>{userProps.parent.subjectName}</span>
                    </div>
                    : ""}

            </>
        )
    }, [])

    const userContent = React.useCallback(() => {
        return <div>
            <li style={{ paddingBottom: 8 }}><Button key="changePassword" type="link" onClick={changePassword}>Сменить пароль</Button></li>
            <li><Button key="logout" type="link" icon={<LogoutOutlined />} onClick={logoutCB}>Выход</Button></li>
        </div>
        // eslint-disable-next-line
    }, [logoutCB])

    const getContours = () => {
        const modules = JSON.parse(getItemFromLocalStorage("modules"));
        const allowModules = (modules ?? []).map(value => {
            return value.applicationExe.toLowerCase();
        });
        const allowContours = [];
        CONTOURS_WITH_MODULES.forEach((value, key) => {
            const includingModules = value.map(value => {
                return allowModules.indexOf(value.name.toLowerCase()) !== -1 ? value.name.toLowerCase() : undefined;
            }).filter(value => value);
            if (includingModules.length > 0) {
                allowContours.push(key);
            }
        });
        return allowContours.map(value => {
            return (
                getSubMenu(value.name, "drawer-menu-item")
            )
        });
    }

    const isMobile = !useMediaQuery({ minWidth: 768 })
    setMobile(isMobile);

    const moduleName = MODULES[(typeof (props.menu) === "string" ? props.menu : props.menu[0])];
    document.title = moduleName ?? "Worktime New";
    let defaultOpenKeys = Array.isArray(props.menu) ? props.menu : [props.menu];
    if ([MODULE_CREDENTIAL.name].indexOf(defaultOpenKeys[0]) !== -1) {
        defaultOpenKeys.unshift(CONTOUR_ADMIN.name);
    }

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <DesktopOrTabletScreen>
                <Sider collapsible collapsed={collapsed} onCollapse={setCollapse} width="340px">
                    <Link to="/"><div className="logo"><img className="logo-long-img" src={logo} alt="" /><div className="teg"><img className="teg" src={teg} alt="" /><p>Worktime New</p></div></div></Link>
                    <Link to="/"><img src={logo} className="logo-img" alt="Worktime New" /></Link>
                    <div>
                        <Menu
                            className="main-menu"
                            mode="inline"
                            defaultOpenKeys={defaultOpenKeys}
                            defaultSelectedKeys={props.submenu !== "none" ? [props.submenu] : (Array.isArray(props.menu) ? props.menu : [props.menu])}
                        >
                            {getContours(true)}
                        </Menu>
                        <hr />
                        <Popover visible={visibleUserPopover}
                            onVisibleChange={(value) => setVisibleUserPopover(value)}
                            placement="bottomLeft"
                            title={userTitle()}
                            content={userContent()} trigger="click">
                            <div className="user-container">
                                {getUserInfo()}
                            </div>
                        </Popover>
                    </div>
                </Sider>
            </DesktopOrTabletScreen>
            <MobileScreen>
                <Drawer
                    className="drawer-main-menu"
                    title={<div style={{ lineHeight: 2.0 }}>Worktime New
                        <Button shape="circle" className="noborder align-right"
                            icon={<CloseOutlined />}
                            onClick={() => setVisibleMobileMenu(false)} /></div>
                    }
                    placement={"left"}
                    closable={false}
                    visible={visibleMobileMenu}
                    onClose={() => setVisibleMobileMenu(false)}
                >
                    <Menu mode="inline" defaultSelectedKeys={[props.subsystem]}>
                        {getContours(true)}
                    </Menu>
                    <hr />
                    <Popover visible={visibleUserPopover}
                        onVisibleChange={(value) => setVisibleUserPopover(value)}
                        placement="bottomLeft"
                        title={userTitle()}
                        content={userContent()} trigger="click">
                        <div className="user-container">
                            {getUserInfo()}
                        </div>
                    </Popover>
                </Drawer>
            </MobileScreen>
            <Layout className="site-layout">
                <MobileScreen>
                    <div className="mob-button-panel">
                        <Button className="main-menu-drawer-open" shape="circle"
                            icon={<MenuOutlined />}
                            onClick={() => setVisibleMobileMenu(true)} />
                        {buildMobileButtons(props.buttons)}
                    </div>
                </MobileScreen>
                <Content>
                    <div className="site-layout-workspace">
                        {props.children}
                    </div>
                </Content>
            </Layout>
            {topLayer.map(item => item)}
        </Layout>
    );
}


export default App;