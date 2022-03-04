import React from 'react';
import { Form } from 'antd';
import { FORM_ITEMS_LAYOUT } from "../../lib/Const";
import DataTransfer from "../../lib/DataTransfer";
import { buildURL } from "../../lib/Utils";
import { genDefParamsForGetAllList } from "../../lib/Utils";
import { CONTOUR_ADMIN, MODULE_CREDENTIAL } from "../../lib/ModuleConst";

// Управление доступом на объекты для ролей
export const ManageControlObjectRoleForm = (props) => {

    const readyForm = Object.keys(props.initialValues).length > 0;
    console.log("readyForm=", readyForm);
    // Урл для для получения всего списка всех ролей
    const url = buildURL(CONTOUR_ADMIN, MODULE_CREDENTIAL, "controlobjectrole") + "/getlist";
    console.log("url=", url);
    // Параметры выборки для получения всего списка отсортированнного по полю
    const params = genDefParamsForGetAllList("controlObjectUrl");
    console.log("params=" + JSON.stringify(params));

    return <Form
        {...FORM_ITEMS_LAYOUT}
        form={props.form}
        layout="horizontal"
        name="formManageAccessRole"
        onFieldsChange={props.onFieldsChange}
        initialValues={props.initialValues}>
        <Form.Item
            name="accessRoleIds"
            valuePropName="targetKeys"
        >
            <DataTransfer
                uri={url}
                params={params}
                onRender={item => item.accessRoleName}
                ready={readyForm}
            />
        </Form.Item>
    </Form>
}