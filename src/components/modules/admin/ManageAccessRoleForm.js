import React from 'react';
import { Form } from 'antd';
import { FORM_ITEMS_LAYOUT } from "../../lib/Const";
import DataTransfer from "../../lib/DataTransfer";
import { buildURL, genDefParamsForGetAllList } from "../../lib/Utils";
import { CONTOUR_ADMIN, MODULE_CREDENTIAL } from "../../lib/ModuleConst";

// Управление ролями пользователя
export const ManageAccessRoleForm = (props) => {

    const readyForm = Object.keys(props.initialValues).length > 0;
    console.log("readyForm=", readyForm);
    const url = buildURL(CONTOUR_ADMIN, MODULE_CREDENTIAL, "AccessRole") + "/getlist";
    console.log("url=", url);
    //const params = genDefParamsForGetAllList("accessRoleName");
    const params = {
        pagination: {
            current: 1,
            pageSize: -1
        },
        sort : [
            {field : 'accessRoleName', order : 'ascend'}
        ],
        filters : {onlyVisible : 1}
    };
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