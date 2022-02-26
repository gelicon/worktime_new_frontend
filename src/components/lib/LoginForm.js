import React from 'react';
import { Button, Form, Input, Checkbox } from 'antd';
import requestToAPI,{ERROR_CODES} from "./Request";
import { HTTP_STATUS_UNAUTHORIZED } from "./Request";
import { MSG_NO_LOGIN_OR_PASSWORD } from "./Const";
import { resq$ } from 'resq';
import { CONTOUR_ADMIN, MODULE_CREDENTIAL } from "./ModuleConst";
import { buildURL, getItemFromLocalStorage, setItemInLocalStorage } from "./Utils";

const URI_FOR_LOGIN = "gettoken";

export let userProps = getItemFromLocalStorage("userProps")?JSON.parse(getItemFromLocalStorage("userProps")):undefined;

export const getLoginButton = (status, history,cb) => {
    if (status != HTTP_STATUS_UNAUTHORIZED) {
        return undefined;
    }
    return <Button type="primary" onClick={() => logout(history,cb)}>Вход в систему</Button>
}

export const restoreToken = () => {
    if (!requestToAPI.token) {
        let saveToken = sessionStorage.getItem("token") ?? localStorage.getItem("token");
        if (saveToken) {
            console.log("Restore token")
            requestToAPI.token = saveToken;
            requestToAPI.user = {
                name: sessionStorage.getItem("user.name") ?? localStorage.getItem("user.name"),
                login: sessionStorage.getItem("user.login") ?? localStorage.getItem("user.login")
            }
        }
    }
}


/**
 * В options передать:
 *  - form - форма ввода
 *  - setControlCase - метод установки флага временного пароля
 *  - setUserName - метод установки имени пользователя (для временного пароля)
 *  - setLoading - метод установки индикатора загрузки
 * @param {*} options 
 * @param {*} values - пользователь и пароль
 * @returns обещание
 */
 export const loginProcess = (values, options)=>{
    options.form.setFieldsValue({error: undefined});
    options.setLoading(true);
    return requestToAPI.post(URI_FOR_LOGIN, values)
        .catch((error) => {
            options.setLoading(false);
            cleanLocalStorage();
            cleanSessionStorage();
            // тут сообщение перекроем, так как UNAUTHORIZED имеет смысл другой
            if (error.status == HTTP_STATUS_UNAUTHORIZED) {
                error.message = MSG_NO_LOGIN_OR_PASSWORD;
            }
            if (error.errorCode == ERROR_CODES.TEMPORARY_ACCESS) {
                options.setControlCase("tempPass");
                options.setUserName(options.form.getFieldValue("userName"));
            }
            if (error.message) {
                options.form.setFieldsValue({ error: error.message });
            }
            throw error;
        })
        .then(response => {
            requestToAPI.token = response.token;
            requestToAPI.user = {
                login: response.user.login,
                name: response.user.name,
            };
    
            if (options.form.getFieldValue("saveflag")) {
                setLocalStorage(requestToAPI.token, requestToAPI.user);
            } else {
                setSessionStorage(requestToAPI.token, requestToAPI.user);
            };
    
            return requestToAPI.post(buildURL(CONTOUR_ADMIN, MODULE_CREDENTIAL, "applicationrole") + "/accesslist", {});
        })
        .then(response => {
            setItemInLocalStorage("modules", JSON.stringify(response.result));
            return requestToAPI.post("system/capclasstype/getlist", {});
        })    
        .then(response => {
            setItemInLocalStorage("capClassTypeList", JSON.stringify(response.result));
            options.setLoading(false);
        })
    
}



let _activeValidator;

export const LoginContent = (props) => {
    const [form] = Form.useForm();
    const firstInputRef = React.useRef(null);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        const timerId = setTimeout(() => {
            firstInputRef.current.focus({
                cursor: 'end',
            })
        }, 100);
        return () => {
            clearTimeout(timerId)
        }
    })

    const handleKeyDown = (ev) => {
        if (ev.which == 13) {
            let root = document.getElementById("root");
            const okBtn = resq$('Button', root).byProps({ type: "primary" });
            okBtn.props.onClick(okBtn);
        }
    }

    const login = () => {
        return _activeValidator.validateFields()
            .then((values) => {
                return loginProcess(values, {
                    form:_activeValidator,
                    setControlCase:props.setControlCase,
                    setUserName:props.setUserName,
                    setLoading:setLoading
                })
                .then(()=>{
                    if (props.cb) {
                        props.cb();
                    }                
                })
            })    
    }

    function forgetPass(e) {
        e.preventDefault();
        props.setControlCase("forgetPass");
    }

    _activeValidator = form;

    return <div onKeyDown={handleKeyDown}>
        <Form
            layout={"vertical"}
            form={form}
            name="formLogin"
            style={{ padding: 20 }}
            initialValues={{}}>

            <Form.Item
                name="userName"
                label="Имя пользователя"
                rules={[
                    {
                        required: true,
                        message: "Имя пользователя не может быть пустым"
                    }
                ]}>
                <Input ref={firstInputRef} />
            </Form.Item>

            <Form.Item
                name="password"
                label="Пароль"
                rules={[
                    {
                        required: true,
                        message: "Пароль не может быть пустым"
                    }
                ]}
            >
                <Input.Password />
            </Form.Item>
            <Form.Item
                name="saveflag"
                valuePropName="checked"
                getValueFromEvent={(event) => {
                    return event.target.checked ? 1 : 0;
                }}
            >
                <Checkbox>Запомнить меня</Checkbox>
            </Form.Item>
            <Form.Item
                noStyle>
                <button
                    type="button"
                    className="link-button forget-pass"
                    onClick={forgetPass}
                >
                    Забыли пароль?
                </button>
            </Form.Item>
            <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.error !== currentValues.error}>
                {
                    ({ getFieldValue }) =>
                        getFieldValue('error') ? (
                            <div className="ant-form-item ant-form-item-explain ant-form-item-explain-error">{getFieldValue('error')}</div>
                        ) : null
                }
            </Form.Item>
            <Form.Item>
                <Button type="primary" onClick={login} loading={loading}>Войти</Button>
            </Form.Item>
        </Form>
    </div>

}


export const setSessionStorage = (token, user) => {
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("user.login", user.login);
    sessionStorage.setItem("user.name", user.name);
    cleanLocalStorage();
}

export const cleanSessionStorage = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user.login");
    sessionStorage.removeItem("user.name");
}

export const setLocalStorage = (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user.login", user.login);
    localStorage.setItem("user.name", user.name);
    cleanSessionStorage();
}

export const cleanLocalStorage = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user.login");
    localStorage.removeItem("user.name");
}

export const logout = (history, cb) => {
    requestToAPI.token = undefined;
    requestToAPI.user = undefined;
    cleanLocalStorage();
    cleanSessionStorage();
    history.push("/");
    if (cb) cb();
}