import React from 'react';
import PropTypes from 'prop-types';

import { notification, Button } from 'antd';
import { MSG_NO_RECORD_FORGETONE, MSG_SAVE_ERROR} from './Const';
import requestToAPI from "./Request";
import { getLoginButton } from "./LoginForm";
import { useHistory } from "react-router-dom";
import moment from 'moment';

import ModuleHeader from "./ModuleHeader";


const EditPage = (props) => {
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [internalTrigger] = React.useState({});
    const [status] = React.useState({});
    const [contextParams] = React.useState({});
    const history = useHistory();

    const idName = props.idName;
    const convertors = props.convertors;

    //Загрузка
    const load = React.useCallback(() => {
        const convertLoad = (response) => {
            let convertedResponse = { ...response };
            if (convertors && convertors.date) {
                convertors.date.forEach(element => {
                    if (convertedResponse[element]) {
                        convertedResponse[element] = moment(convertedResponse[element]);
                    }
                });
            }
            return convertedResponse;
        };

        status.modified = false;
        setLoading(true);
        if (props.editorContext.uriForGetOne) {
            console.log(props.editorContext.id>0 ? "Load for id = " + props.editorContext.id : "Load for add");
            requestToAPI.post(props.editorContext.uriForGetOne, props.editorContext.id>0?props.editorContext.id:"")
                .then(response => {
                    // если компонент размонтирован не надо устанавливать данные
                    if (!contextParams.mountFlag) return;
                    if (props.onAfterLoad) {
                        response = props.onAfterLoad(response) ?? response;
                    }
                    setLoading(false);
                    // Выполним конвертирование полученного ответа в соответствии с пропсом convertors
                    setData(convertLoad(response));
                    // если есть внутренее событие
                    if(internalTrigger.onAfterLoad) {
                        internalTrigger.onAfterLoad(response);
                    }
                    props.form.resetFields();
                })
                .catch(error => {
                    // если компонент размонтирован не надо устанавливать данные
                    if (!contextParams.mountFlag) return;
                    setLoading(false);
                    notification.error({
                        message: MSG_NO_RECORD_FORGETONE,
                        description: error.message,
                        btn: getLoginButton(error.status, history)
                    })
                })
        } else if (props.editorContext.record) {
            setLoading(false);
            setData(convertLoad(props.editorContext.record));
        } else {
            setLoading(false);
            setData({});
        }
    }, [props, status, history, contextParams.mountFlag, convertors,internalTrigger])


    const save = React.useCallback((values, after) => {
        const convertSave = (values) => {
            let convertedValues = { ...values };
            if (convertors && convertors.date) {
                convertors.date.forEach(element => {
                    if (convertedValues[element]) {
                        convertedValues[element] = convertedValues[element].valueOf();
                    }
                });
            }
            return convertedValues;
        };

        // Выполним конвертирование сохраняемых данных в соответствии с пропсом convertors
        const valuesForSend = convertSave(values);
        console.log("Save values", valuesForSend);
        if (props.editorContext.uriForSave) {
            setLoading(true);
            requestToAPI.post(props.editorContext.uriForSave, valuesForSend)
                .then(response => {
                    setLoading(false);
                    after(response);
                    history.goBack();
                })
                .catch(error => {
                    setLoading(false);
                    notification.error({
                        message: MSG_SAVE_ERROR,
                        description: error.message,
                        btn: getLoginButton(error.status, history)
                    })

                    // Нужно обновить data иначе поля ввода пересоздадуться с initValues
                    const newdata = { ...data };
                    Object.assign(newdata, values);
                    setData(newdata);
                })
        } else {
            after(values);
        }
    }, [props, data, history, convertors]);

    React.useEffect(() => {
        contextParams.mountFlag = true;

        if (!data) {
            setData({});
            load();
        }
        // размонтирования компонента сбросит флаг
        return () => contextParams.mountFlag = false;
    }, [data, contextParams, load]);

    const mergeInitialValues = (data, initialValues) => {
        for (var i in initialValues) {
            data[i] = initialValues[i];
        }
        return data;
    }

    const beforeSave = React.useCallback((values) => {
        if (internalTrigger.onBeforeSave) {
            internalTrigger.onBeforeSave(values);
        }
        if (props.beforeSave) {
            props.beforeSave(values);
        }
    }, [props, internalTrigger])

    const afterSave = React.useCallback((response) => {
        status.modified = false;
        if (props.afterSave) {
            props.afterSave(response);
        }
    }, [props, status])

    const handleFieldsChange = (flds) => {
        status.modified = true;
    }

    const handleOk = (ev) => {
        props.form.validateFields()
            .then((values) => {
                // при редактировании добавим Id в данные
                if (props.editorContext.id>0) {
                    values[idName] = props.editorContext.id;
                }
                beforeSave(values);
                save(values, (response) => {
                    console.log("after save response", response);
                    afterSave(response);
                    setData(null);
                })
            })
            .catch((info) => {
                console.log('Validate Failed:', info);
            });
    }
    
    const handleKeyDown = (ev) => {
        switch (ev.which) {
            case 13: {
                document.getElementById("ok-btn").click(); 
                ev.stopPropagation();
                break;
            }
            default:
        }
    }

    const buttons = [
        <Button id="ok-btn" type={"primary"} key="3" loading={loading} onClick={handleOk}>Сохранить</Button>,
        ...(props.buttons??[])
    ];

    const values = mergeInitialValues(data || {}, props.children.props.initialValues);

    return <React.Fragment>
            <ModuleHeader
                search={false}
                title={props.title || (props.editorContext.id>0 ? "Изменение записи" : "Новая запись")}
                buttons={buttons}
            />
            <hr/>
            <div onKeyDown={handleKeyDown}>
                {props.children ? React.cloneElement(props.children, {
                    initialValues: values,
                    internalTrigger: internalTrigger,
                    onFieldsChange: handleFieldsChange,
                    form:props.form,
                    mode: props.editorContext.id ? 1 : 0
                }) : null}
            </div>

    </React.Fragment>;
}

export default EditPage;

EditPage.propTypes = {
    idName: PropTypes.string,  // default "id"
    editorContext: PropTypes.object.isRequired,
    beforeSave: PropTypes.func,
    afterSave: PropTypes.func,
    form: PropTypes.object.isRequired,
    convertors: PropTypes.object,
    buttons:PropTypes.array
}

EditPage.defaultProps = {
    idName: "id"
}