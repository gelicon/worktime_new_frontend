import React from 'react';
import ReactDOM from 'react-dom';

import Main from './components/modules/Main';
import Edizm from './components/modules/edizm/Edizm';
//import ReferenceBooks from "./components/contour/ReferenceBooks";
import Error from "./components/Error";
import Admin from "./components/contour/Admin";
import ProgUser from "./components/modules/admin/ProgUser";
import ProgUserGroup from "./components/modules/admin/ProgUserGroup";
import AccessRole from "./components/modules/admin/AccessRole";
import ControlObject from "./components/modules/admin/ControlObject";
import ApplicationRole from "./components/modules/admin/ApplicationRole";

import Department from './components/modules/worktime/Department/Department';

import { MSG_PAGENOTFOUND, DEFAULT_DATE_FORMAT } from "./components/lib/Const";

import './resources/css/theme.less';
import './resources/css/index.css';

import { ConfigProvider } from 'antd';
import ruRU from 'antd/lib/locale/ru_RU';
import moment from 'moment';
import 'moment/locale/ru';

import { Route } from 'react-router';
import { BrowserRouter, Switch } from "react-router-dom";


document.documentElement.lang = 'ru';
moment.locale('ru');
moment().format(DEFAULT_DATE_FORMAT);

const validateMessages = {
    required: "Необходимо определить '${label}'",// eslint-disable-line
    string: {
        max: "Длина '${label}' не может быть больше ${max}"// eslint-disable-line
    }

};
console.log("environment=", process.env);

ReactDOM.render(
    <ConfigProvider locale={ruRU} form={{ validateMessages }}>
        <BrowserRouter>
            <Switch>
            <Route exact path='/'><Main /></Route>
                {/*<Route exact path='/refbooks'><ReferenceBooks /></Route>*/}
                <Route exact path='/edizm'><Edizm /></Route>
                <Route exact path='/department'><Department /></Route>
                {/* Контур Администрирование */}
                <Route exact path='/admin'><Admin /></Route>
                <Route exact path='/progusergroup'><ProgUserGroup /></Route>
                <Route exact path='/proguser'><ProgUser /></Route>
                <Route exact path='/accessrole'><AccessRole /></Route>
                <Route exact path='/controlobject'><ControlObject /></Route>
                <Route exact path='/applicationrole'><ApplicationRole /></Route>

                <Route><Error text={MSG_PAGENOTFOUND} helpId="/help/pagenotfound" /></Route>
            </Switch>
        </BrowserRouter>
    </ConfigProvider>
    , document.getElementById('root')
);