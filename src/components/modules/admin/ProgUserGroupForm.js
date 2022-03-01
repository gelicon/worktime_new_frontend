import React from 'react';
import { Form, Input, Checkbox } from 'antd';
import { FORM_ITEMS_LAYOUT } from "../../lib/Const";


const ProgUserGroupForm = (props) => {
    const firstInputRef = React.useRef(null);

    React.useEffect(() => {
        setTimeout(() => {
            firstInputRef.current.focus({
                cursor: 'end',
            })
        }, 100);
    });

    return <Form
        {...FORM_ITEMS_LAYOUT}
        form={props.form}
        layout="horizontal"
        name="formAccessRole"
        onFieldsChange={props.onFieldsChange}
        initialValues={props.initialValues}>
        <Form.Item
            name='progusergroupName'
            label='Наименование'
            rules={[
                { required: true },
                { max: 30 }
            ]}>
            <Input ref={firstInputRef} />
        </Form.Item>
        <Form.Item
            name='progusergroupNote'
            label='Описание'
            rules={[
                { max: 255 }
            ]}>
            <Input />
        </Form.Item>
        <Form.Item
            name='progusergroupVisible'
            label='Видимость'
            valuePropName="checked"
            getValueFromEvent={(event) => {
                return event.target.checked ? 1 : 0;
            }}
        >
            <Checkbox></Checkbox>
        </Form.Item>
    </Form>
}

export default ProgUserGroupForm;
