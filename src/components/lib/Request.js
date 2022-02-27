import { MSG_NETWORK_ERROR, MSG_NO_ACCESS } from './Const';
import { cleanLocalStorage, cleanSessionStorage, setLocalStorage, setSessionStorage } from "./LoginForm";

/**
 * Версия API с которой работает система
 */
const CURR_VERSION_API = 1

// определяется в .env в момент компиляции!
const BASE_URL = process.env.NODE_ENV == "production" ? process.env.REACT_APP_PROD_ENDPOINT : process.env.REACT_APP_DEV_ENDPOINT;

/**
 * Методы API должны возвращать http статус UNAUTHORIZED, если токен устарел или неверен
 */
export const HTTP_STATUS_UNAUTHORIZED = 401;

/**
 * Для работы нужно установить токен доступа к API requestToAPI.token = ...
 * Все методы get, post возвращают Promise
 * Обработка ошибок в двух случаях
 * 1: HTTP статус != 200
 * 2. HTTP статус = 200. Ошибка в самом json ответе
 */
/** это имя свойства в ответе, наличие которого сигнализирует об ошибке */
const ERROR_PROP_NAME = "errorCode";
/** это имя свойства в ответе, где сообщение об ошибке */
const ERROR_MESSAGE_PROP_NAME = "errorMessage";

export const ERROR_CODES = {
    UNKNOWN_ERROR: 100,
    /** Отсутствует сортировка при наличии пагинации */
    BAD_PAGING_NO_SORT: 123,
    /** Ошибка при выборке данных */
    FETCH_ERROR: 124,
    /** Ошибка при сохранении данных */
    POST_ERROR: 125,
    /** Ошибка при удалении данных */
    DELETE_ERROR: 126,

    USER_LOCKED: 127,
    USER_OR_PASSWORD_INCORRECT: 128,
    TOKEN_INCORRECT: 129,
    TOKEN_EXPIRED: 140,

    ACCESS_DENIED: 130,
    TEMPORARY_ACCESS: 131
}

const requestToAPI = {
    token: undefined,   // token доступа
    /**
     * информация о текущем пользователе. Объект 
     * {
     *  name:"фио пользователя",
     *  login:"логин пользователя"
     * }
     */
    user: undefined,
    /**
     * @param {*} url - если начинается с / то префиксы к url не добавляются
     * @param {*} data - данные в теле запроса в виде объекта
     * @param {*} config - опции: extResponse - в then передается полный ответ (с заголовками, статусом и т.д), иначе только payload
     * @returns 
     */
    get: (url, config) => {
        config = config || {};
        return new Promise((resolve, reject) => {
            const options = {
                method: 'get',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + requestToAPI.token
                },
                credentials: "omit"
            };
            fetch(BASE_URL + "/" + requestToAPI.getUrl(url), options)
                .then(response => {
                    if (!response.ok) {
                        let status = response.status,
                            statusText = response.statusText;

                        if (status == HTTP_STATUS_UNAUTHORIZED) {
                            statusText = MSG_NO_ACCESS;
                        }
                        const err = new Error(statusText)
                        err.status = status;

                        throw err;
                    };
                    if (config.extResponse) {
                        return response;
                    } else {
                        return response.json()
                    }
                })
                .then(json => {
                    if (json && json.fieldErrors && Object.keys(json.fieldErrors).length !== 0) {
                        reject({ message: Object.keys(json.fieldErrors).map(value => json.fieldErrors[value]).join(". ")});
                    } else if (json && json[ERROR_PROP_NAME]) {
                        reject({ message: json[ERROR_MESSAGE_PROP_NAME] });
                    } else {
                        resolve(json);
                    }
                })
                .catch((error) => {
                    if (error.status) {
                        reject(error);
                    } else {
                        reject({ message: MSG_NETWORK_ERROR });
                    }
                })
        });

    },
    /**
     * @param {*} url - если начинается с / то префиксы к url не добавляются
     * @param {*} data - данные в теле запроса в виде объекта
     * @param {*} config - опции: extResponse - в then передается полный ответ (с заголовками, статусом и т.д), иначе только payload
     * @returns 
     */
    post: (url, data, config) => {
        config = config || {};
        return new Promise((resolve, reject) => {
            const options = {
                method: 'post',
                mode: 'cors',
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + requestToAPI.token
                },
                credentials: "omit"
            };
            //console.log('options', options);
            const currentURL = BASE_URL + "/" + requestToAPI.getUrl(url);
            //console.log('currentURL', currentURL);
            fetch(currentURL, options)
                .then(response => {
                    if (!response.ok) {
                        let status = response.status,
                        statusText = response.statusText;
                        if (status == HTTP_STATUS_UNAUTHORIZED) {
                            statusText = MSG_NO_ACCESS;
                        }
                        const err = new Error(statusText)
                        err.status = status;

                        throw err;
                    } else {
                        if (config.extResponse) {
                            return response;
                        } else {
                            return response.json()
                        }
                    }
                })
                .catch((error) => {
                    console.error(error);
                    if (error.status) {
                        reject(error);
                    } else {
                        reject({ message: MSG_NETWORK_ERROR })
                    }
                })
                .then(json => {
                    if (json && json.fieldErrors && Object.keys(json.fieldErrors).length !== 0) {
                        reject({ message: Object.keys(json.fieldErrors).map(value => json.fieldErrors[value]).join(". ")});
                    } else if (json && json[ERROR_PROP_NAME]) {
                        reject({message: json[ERROR_MESSAGE_PROP_NAME],[ERROR_PROP_NAME]:json[ERROR_PROP_NAME]});
                    } else {
                        resolve(json);
                    }
                })
        });
    },
    getUrl: (url) => {
        // если от корня то префиксы не вставляем
        if (url.startsWith("/")) {
            return url.substring(1);
        }
        return ((url === "gettoken" || url === "renew") ? "security/" : "v" + CURR_VERSION_API + "/apps/") + url;
    },
    renew: (replayUrl, replayData) => {
        return new Promise((resolve, reject) => {
            requestToAPI.post("renew", { "token": requestToAPI.token })
                .then(response => {
                    requestToAPI.token = response.token;
                    requestToAPI.user = {
                        login: response.userLogin,
                        name: response.userName,
                    };

                    if (sessionStorage.getItem("token")) {
                        setSessionStorage(requestToAPI.token, requestToAPI.user);
                    } else {
                        cleanSessionStorage();
                    };

                    if (localStorage.getItem("token")) {
                        setLocalStorage(requestToAPI.token, requestToAPI.user);
                    } else {
                        cleanLocalStorage();
                    };

                    requestToAPI.post(replayUrl, replayData)
                        .then(response => {
                            resolve(response);
                        })
                        .catch(() => {
                            reject();
                        })
                })
                .catch(() => {
                    reject();
                })
        })
    }
}

export default requestToAPI;