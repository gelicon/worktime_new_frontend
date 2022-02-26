import React from 'react';
import App from '../App';
import ModuleHeader from "../lib/ModuleHeader";
import requestToAPI from "../lib/Request";
import { LoginContent } from "../lib/LoginForm";
import { SetPasswordContent } from "../lib/SetPasswordForm";
import { ForgetPassword } from "../lib/ForgetPassword";

const MOD_TITLE = "Добро пожаловать в систему Worktime New";
const MODE_HELP_ID = "help/main"

function SignupContent(props) {
    const [controlCase, setControlCase] = React.useState("");
    const [userName, setUserName] = React.useState("");


    switch (controlCase) {
        case "tempPass":
            return <SetPasswordContent cb={props.cb} userName={userName}/>;
        case "forgetPass":
            return <ForgetPassword/>
        default:
            return <LoginContent cb={props.cb} setControlCase={setControlCase} setUserName={setUserName}/>
    }
}

const Main = (props) => {
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);
    // проверяем наличие сохраненного токен
    let saveToken = sessionStorage.getItem("token") ?? localStorage.getItem("token");

    return requestToAPI.token || saveToken ? (
        <App subsystem={true} menu={true} submenu={true}
            helpId={MODE_HELP_ID}
            defaultCollapsed={false}
            afterLogin={forceUpdate}
            afterLogout={forceUpdate}
        >
            <ModuleHeader title={MOD_TITLE} search={false} />
            <hr></hr>
            <p style={{fontSize:"medium"}}>
                Система учета использования рабочего времени.
                Она позволяет:
                <li>Учитывать рабочее время</li>
                <li>Получать аналитику по проектам</li>
            </p>
        </App>
    ) : (
        <div className="center">
            <SignupContent cb={forceUpdate} />
        </div>
    )
}
export default Main;