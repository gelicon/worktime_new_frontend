import { TeamOutlined} from '@ant-design/icons';

// Контуры (в lowerCase)
export const CONTOUR_ADMIN = { name: "admin", title: "Администрирование", icon: <TeamOutlined /> };
export const CONTOUR_REFBOOKS = { name: "refbooks", title: "Справочники" };

export const CONTOURS = {
    "refbooks": "Справочники",
    "admin": "Администрирование",
}

// Модули (в lowerCase)
// В контуре "Администрирование"
export const MODULE_CREDENTIAL = { name: "credential", title: "Учетные данные" };
// В контуре "Справочники"
export const MODULE_EDIZM = { name: "edizm", title: "Единицы измерения" };

export const NONE = {};

export let MODULES = {};
MODULES[MODULE_CREDENTIAL.name] = MODULE_CREDENTIAL.title;
MODULES[MODULE_EDIZM.name] = MODULE_EDIZM.title;

export const CONTOURS_WITH_MODULES = new Map([
    [CONTOUR_REFBOOKS, [MODULE_EDIZM]],
    [CONTOUR_ADMIN, [MODULE_CREDENTIAL]],
]);