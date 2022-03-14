import { TeamOutlined} from '@ant-design/icons';

// Контуры (в lowerCase)
// Меню верхнего уровня
export const CONTOUR_REFBOOKS = { name: "refbooks", title: "Справочники" };
export const CONTOUR_ADMIN = { name: "admin", title: "Администрирование", icon: <TeamOutlined /> };

// Модули (в lowerCase)
// Меню второго уровня
export const MODULE_EDIZM = { name: "edizm", title: "Единицы измерения" };
export const MODULE_ORGSTRUCT = { name: "orgstruct", title: "Организационная структура" };
export const MODULE_CREDENTIAL = { name: "credential", title: "Учетные данные" };

// Модули
export let MODULES = {};
MODULES[MODULE_CREDENTIAL.name] = MODULE_CREDENTIAL.title;
MODULES[MODULE_EDIZM.name] = MODULE_EDIZM.title;
MODULES[MODULE_ORGSTRUCT.name] = MODULE_ORGSTRUCT.title;

// Контуры с модулями
export const CONTOURS_WITH_MODULES = new Map([
    [CONTOUR_REFBOOKS, [MODULE_EDIZM, MODULE_ORGSTRUCT]],
    [CONTOUR_ADMIN, [MODULE_CREDENTIAL]],
]);


/* Непонятно где используется
export const CONTOURS = {
    "refbooks": "Справочники",
    "admin": "Администрирование",
}
*/


export const NONE = {};

