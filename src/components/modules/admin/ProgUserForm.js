import React from 'react';
import { Form, Input, Checkbox } from 'antd';
import { FORM_ITEMS_LAYOUT } from "../../lib/Const";
import { intFlagFromCheckboxEvent } from "../../lib/Utils";


const ProguserForm = (props) => {
    const firstInputRef = React.useRef(null);

    React.useEffect(() => {
        setTimeout(() => {
            firstInputRef.current.focus({
                cursor: 'end',
            })
        }, 100);
    });

    // adminTypeFlag - Флаг того, что пользователь администратор
    const [proguserType, setProguserType] = React.useState(props.initialValues["proguserType"] === 1);
    const initialProguserType = props.initialValues["proguserType"] === 1;
    React.useEffect(() => {
        setProguserType(initialProguserType);
    }, [initialProguserType]);

    // statusIdFlag - Флаг того, что пользователь активный
    const [statusId, setStatusId] = React.useState(props.initialValues["statusId"] === 1);
    const initialStatusId = props.initialValues["statusId"] === 1;
    React.useEffect(() => {
        setStatusId(initialStatusId);
    }, [initialStatusId]);

    return <Form
        {...FORM_ITEMS_LAYOUT}
        form={props.form}
        layout="horizontal"
        name="formProguser"
        onFieldsChange={props.onFieldsChange}
        initialValues={props.initialValues}>
        <Form.Item
            name='statusId'
            label='Активный'
            valuePropName='checked'
            getValueFromEvent={intFlagFromCheckboxEvent} // Устанавливает в значение из proguserType
            rules={[
                { required: true }
            ]}
            labelCol={{ span: 16 }}
            className='statusIdCheckBox'
            >
            <Checkbox onChange={() => {
                setStatusId(props.form.getFieldValue("StatusId") === 1);
            }} />
        </Form.Item>
        <Form.Item
            name='proguserName'
            label='Имя'
            rules={[
                { required: true },
                { max: 50 }
            ]}>
            <Input ref={firstInputRef} />
        </Form.Item>
        <Form.Item
            name='proguserFullName'
            label='Полное имя'
            rules={[
                { max: 50 }
            ]}>
            <Input ref={firstInputRef} />
        </Form.Item>
        <Form.Item
            name='proguserType'
            label='Администратор'
            valuePropName='checked'
            getValueFromEvent={intFlagFromCheckboxEvent} // Устанавливает в значение из proguserType
            rules={[
                { required: true }
            ]}
            labelCol={{ span: 16 }}
            className='proguserTypeCheckBox'
            >
            <Checkbox onChange={() => {
                setProguserType(props.form.getFieldValue("proguserType") === 1);
            }} />
        </Form.Item>
    </Form>
}

export default ProguserForm;
