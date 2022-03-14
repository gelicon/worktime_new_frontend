import React from 'react';
import { Form, Input, Checkbox } from 'antd';
import { FORM_ITEMS_LAYOUT } from "../../../lib/Const";


const DepartmentForm = (props) => {
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
            name='departmentName'
            label='Наименование'
            rules={[
                { required: true },
                { max: 30 }
            ]}>
            <Input ref={firstInputRef} />
        </Form.Item>
        <Form.Item
            name='departmentStatusName'
            label='Статус'
        >
            <Checkbox></Checkbox>
        </Form.Item>
    </Form>
}

export default DepartmentForm;
