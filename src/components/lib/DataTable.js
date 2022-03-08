import React from 'react';
import PropTypes from 'prop-types';
import { Table, Tag, notification, Menu, Popover } from 'antd';
import { ExportOutlined, CopyOutlined, MoreOutlined,
    CloseCircleOutlined,
    CaretUpOutlined,CaretDownOutlined } from '@ant-design/icons';
import requestToAPI from "./Request";
import {
    buildSortByDefaultFromColumns, buildSortFromColumns,
    rebuildColumns, resetSortColumns
} from "./Utils";
import { confirm, inputValue } from "./Dialogs";
import { format } from 'react-string-format';
import {
    MSG_CONFIRM_DELETE, MSG_REQUEST_ERROR, MSG_DELETE_ERROR,
    MSG_DELETE_SUCCESS, MSG_SUCCESS_COPY_TO_CLIPBOARD
} from "./Const";
import { getLoginButton } from "./LoginForm";
import { showPropertyDialog } from "./stddialogs/PropertyDialog"
import { exportJsonToCVS, exportJsonToExcel } from "./ExportUtils"
import { useHistory } from "react-router-dom";
import { extractValuesFromInitFilters } from './FilterUtils'
import { isMobile } from './Responsive';
import { EditableCell, EditableRow } from './EditableComponents';
import {drawDate,drawDateAndTime,isPlainObject} from './Utils';
import ColumnDialogMobile from './stddialogs/ColumnDialogMobile';

const { SubMenu } = Menu;

export const ColumnTypes = {
    INTEGER:1,
    FLOAT:2,
    STRING:3,
    DATE:4,
    DATETIME:5
}

// кол-во записей на страницу, по умолчанию
export const DEFAULT_PAGE_SIZE = 10

const SORT_DIRECTIONS = ['ascend', 'descend']

const FILTER_TAG_LIKE = 'like';
const FILTER_TAG_EQ = 'eq';
const FILTER_TAG_NEQ = 'neq';
const FILTER_TAG_ISNULL = 'isnull';

export const nextSortDirection = (current) => {
    if (!current) {
        return SORT_DIRECTIONS[0];
    }
    return SORT_DIRECTIONS[SORT_DIRECTIONS.indexOf(current) + 1];
}

const getTableTD = (elem) => {
    while (elem.nodeName.toUpperCase() != "TD") {
        elem = elem.parentNode;
    }
    return elem;
}

const shortOrderString=(s)=>(s=="ascend"?"asc":s=="descend"?"desc":"unknow");

const buildGraphQLOrderBy=(fields,order)=>{
    let curr = {};
    const result = curr;
    fields.split(".").forEach((fcomp, idx, afields)=>{
        if(idx<afields.length-1) {
            curr[fcomp] = {};
            curr = curr[fcomp];
        } else {
            curr[fcomp] = shortOrderString(order);
        }
    });
    return result;
}
const buildGraphQLWhere=(fields,value)=>{
    let curr = {};
    const result = curr;
    fields.split(".").forEach((fcomp, idx, afields)=>{
        if(idx<afields.length-1) {
            curr[fcomp] = {};
            curr = curr[fcomp];
        } else {
            curr[fcomp] = fcomp!=FILTER_TAG_LIKE?value:"%"+value+"%";
        }
    });
    return result;
}

const buildGraphQLFromParams=(params)=>{ // eslint-disable-line
    const graphQLValues = {
        "order_by":{},
        "where":{},
        "offset":(params.pagination.current-1)*params.pagination.pageSize,
        "limit": params.pagination.pageSize,
    }
    // сортировка
    let orderBy =  {};
    params.sort.forEach(s=>{
        orderBy =  {...orderBy,...buildGraphQLOrderBy(s.field,s.order)}
    })
    graphQLValues.order_by = orderBy;
    
    // фильтры
    const graphQLFilters = [];
    if(params.search) {
        graphQLFilters.push({"allText":{[FILTER_TAG_LIKE]:"%"+params.search+"%"}})
    }
    Object.keys(params.filters).forEach(key=>{
        // добавляем в where только быстрые фильтры
        if(key.startsWith("quick.")) {
            graphQLFilters.push(
                buildGraphQLWhere(key.split(".").slice(1).join("."),params.filters[key])
            );
        } else {
            //если есть именованные фильтры
            const val = params.filters[key];
            if(val===undefined) return;
            // интервал задается объектом {_gte: 1, _lte: 5} поэотму его пропускаем
            if(!isPlainObject(val)) {
                const op = (val instanceof Array)?"_in":"_eq";
                // пустые массивы не добавляем
                if(op=="_in" && val.length==0) return;
                key = key+"."+op;
            }
            graphQLFilters.push(
                buildGraphQLWhere(key,val)
            );

        };
    })
    if(graphQLFilters.length>0) {
        let where = {...graphQLFilters[0]};
        where["_and"]=graphQLFilters.splice(1);
        graphQLValues.where=where;
    }

    return graphQLValues;
}    

const PropertyesPopupMenu = ({ record, columns, visible, x, y, tableInterface, statuses }) => visible &&
    <div className="ant-popover ant-popover-inner" style={{ left: `${x}px`, top: `${y}px`, position: "fixed" }}>
        <Menu>
            <SubMenu key={3} icon={<CopyOutlined />} title="Копировать">
                <Menu.Item key='3.1' onClick={() => { copyRecords([record], columns) }}>Текущую запись</Menu.Item>
                <Menu.Item key='3.2' onClick={() => { copyRecords(tableInterface.getSelectedRecords(), columns) }}>Отмеченные записи</Menu.Item>
            </SubMenu>
            <SubMenu key={2} icon={<ExportOutlined />} title="Экспорт">
                <Menu.Item key="2.1" onClick={() => { tableInterface.exportData(1) }}>Экспорт в CSV</Menu.Item>
                <Menu.Item key="2.2" onClick={() => { tableInterface.exportData(2) }}>Экспорт в Excel</Menu.Item>
            </SubMenu>
            <Menu.Divider />
            <Menu.Item key={1} onClick={() => { showPropertyDialog(record, columns, tableInterface) }}>Свойства...</Menu.Item>
        </Menu>
    </div>

function copyRecords(records, columns) {
    if (records.length > 0) {
        let fields = columns
            .filter(c => !c.serv)
            .map(c => c.dataIndex)
        const sbuf = records
            .map(r => fields.map(k => r[k]).join(" "))
            .join("\r\n");
        navigator.clipboard.writeText(sbuf).then(function () {
            notification.success({
                message: format(MSG_SUCCESS_COPY_TO_CLIPBOARD, records.length)
            })
        });
    }
}

function checkHiddenColumns(columns) {
    if (!isMobile()) return [];
    return columns.filter(c => c.responsive && c.responsive[0] == 'md');
}

const expandedTableColumns = [
    { 
        title: "Сорт", 
        dataIndex: "sortIndicator", 
        width: '41px', 
        render: (data, record) => {
            return <span className="ant-table-column-sorter-inner" style={{marginLeft: "3px"}}>
                {record.order?
                    <>  
                        <CaretUpOutlined className={"ant-table-column-sorter-up"+(record.order=="ascend"?" active":"")}/>
                        <CaretDownOutlined  className={"ant-table-column-sorter-down"+(record.order=="descend"?" active":"")}/>
                    </>
                    :""
                }    
            </span>
        }
    },
    { title: "Колонка", dataIndex: "columnName", width: '30%', ellipsis: true },
    {
        title: "Значение", 
        dataIndex: "value", 
        ellipsis: true,
        render: (data, record) => {
            const originalRecord = record.record;
            return record.render ? record.render(record.value, originalRecord) : data;
        }
    }
];

const LONG_TOUCH_DURATION = 1000;

const DataTable = React.forwardRef((props, ref) => {
    const refOuter = React.useRef(null);
    let [data, setData] = React.useState(null);
    let [loading, setLoading] = React.useState(false);
    let [selectRows, setSelectRows] = React.useState([]);
    let [requestParams] = React.useState({
        // параметры запроса по умолчанию
        pagination: { current: 1, pageSize: DEFAULT_PAGE_SIZE, showSizeChanger: true },
        sort: buildSortByDefaultFromColumns(props.columns) || {},
        filters: props.defaultFilters ? extractValuesFromInitFilters(props.defaultFilters, true) : {},
    });
    const [lastSearchAndFilterState] = React.useState({});
    const [filterColumns] = React.useState({});
    const [contextParams] = React.useState({});
    const { columns, transformerQuickFilters, ...otherProps } = props;
    const [popupState, setPopupState] = React.useState({
        visible: false,
        x: 0,
        y: 0,
        statuses: props.statuses
    });
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);
    const [hiddenColumns] = React.useState(checkHiddenColumns(columns));

    const idName = props.idName;

    const handleHeaderClick = React.useCallback((ev, htmlCol) => {
        // Единственный способ поиска колонки htmlCol.textContent
        const column = columns.find(c=>c.title==htmlCol.textContent);
        const nextOrderDir = nextSortDirection(column.sortOrder);
        if (!ev.ctrlKey) {
            resetSortColumns(columns);
        }
        column.sortOrder = nextOrderDir;
    }, [columns]);

    const history = useHistory();

    rebuildColumns(columns);

    const dlginterface={};

    // для раскрывающиеся колонки в мобильном варианте
    const renderExpandRowForMobile = (record, index, indent, expanded) => {
        if (expanded) {
            const data = hiddenColumns.map(c => {
                const data = { 
                    columnName: c.title, 
                    value: record[c.dataIndex], 
                    render: c.render,
                    record:record,
                    order:c.sortOrder
                };
                return data;
            });

            const onLongTouch = (column,value)=>{
                if(!column.disableQuickFilter) {
                    dlginterface.showModal(column,value);
                }
            }
            const handleSort=(column)=>{
                if(!column.sorter) return;

                const nextOrderDir = nextSortDirection(column.sortOrder);
                resetSortColumns(columns);
                column.sortOrder = nextOrderDir?nextOrderDir:null;
                // колонку нужно превратить в структуру sorder. 
                // Внимание! Всегда одна колонка, так как resetSortColumns
                requestParams.sort = buildSortFromColumns({column:column,field:column.dataIndex,order:column.sortOrder});
                refreshData();

                dlginterface.close();
            }
            const handleFilter=(column,filter,value)=>{
                if(filter=="like") {
                    inputValue(`Быстрый фильтр по полю "${column.title}"`,
                               "Часть текста, которая должна содержаться в данных",
                                (val) => setQuickFilters(column, val, FILTER_TAG_LIKE,record));
                } else {
                    setQuickFilters(column, record[column.dataIndex], filter=="neq"?FILTER_TAG_NEQ:FILTER_TAG_EQ,record);
                }
                dlginterface.close();
            }

            let timer;


            expandedTableColumns[1].onCell=(record, rowIndex) => {
                return {
                    onTouchStart: event => {
                        console.log("ontouchstart");
                        timer = setTimeout(()=>onLongTouch(hiddenColumns[rowIndex],record.value), LONG_TOUCH_DURATION); 
                    },
                    onTouchEnd: event => {
                        if(timer) {
                            event.preventDefault();
                            clearTimeout(timer);
                        }
                        console.log("ontouchend");
                    },
                };
            }
            expandedTableColumns[0].onCell=(record, rowIndex) => {
                return {
                    onClick: event => {
                        handleSort(hiddenColumns[rowIndex]);
                    }
                }    
            };    

            return (
                <Table rowKey={"columnName"}
                    columns={expandedTableColumns}
                    dataSource={data}
                    pagination={false}
                    showHeader={false}
                    footer={()=>ColumnDialogMobile({interface:dlginterface, onSortNext:handleSort,onFilter:handleFilter})}
                />
            );
        }
    }
    const expandedRowRender = hiddenColumns.length > 0 ? renderExpandRowForMobile : null;

    const downloadData = React.useCallback((params, succFn, errorFn) => {
        console.log("request params", params);
        console.log("url for select=" + props.uri.forSelect);
        setLoading(true);
        requestToAPI.post(props.uri.forSelect, params)
            .then(response => {
                // если компонент размонтирован не надо устанавливать данные
                if (!contextParams.mountFlag) return;
                succFn(response)
                setLoading(false);
            })
            .catch((error) => {
                console.log(error);
                // если компонент размонтирован не надо устанавливать данные
                if (!contextParams.mountFlag) return;
                setLoading(false);
                if (errorFn) errorFn(error);
                const key = `notification${Date.now()}`;
                notification.error({
                    key:key,
                    message: MSG_REQUEST_ERROR,
                    description: error.message,
                    btn: getLoginButton(error.status, history,()=>notification.close(key))
                })
            })

    }, [props, contextParams.mountFlag, history])

    const updateStatusSeachAndFilter = React.useCallback(() => {
        // Если изменилась строка поиска переходим на первую страницу
        if (requestParams.search != lastSearchAndFilterState.search) {
            requestParams.pagination.current = 1;
        }
        lastSearchAndFilterState.search = requestParams.search;

        // Аналогично с фильтрами, только фильтра - объект   
        if (JSON.stringify(requestParams.filters) !== JSON.stringify(lastSearchAndFilterState.filters)) {
            requestParams.pagination.current = 1;
        }
        lastSearchAndFilterState.filters = Object.assign({}, requestParams.filters);
    }, [requestParams, lastSearchAndFilterState])

    const refreshData = React.useCallback(() => {
        if (props.onBeforeRefresh) {
            if (!props.onBeforeRefresh(requestParams)) {
                // сброс отметок записей
                setSelectRows([]);
                // установка пакета данных
                setData([]);
                requestParams.pagination.total = 0;
                return;
            }
        }
        updateStatusSeachAndFilter();
        downloadData(requestParams, (response) => {
            // сброс отметок записей
            setSelectRows([]);
            // установка пакета данных
            setData(response.result);
            if (props.defaultSelectRows) {
                if (response.result.length == 1)
                    setSelectRows([response.result[0].code]);
            }
            requestParams.pagination.total = response.allRowCount;
            requestParams.pagination.showTotal = ()=>`Всего ${requestParams.pagination.total}`;
            if (props.onAfterRefresh) {
                props.onAfterRefresh();
            }
        }, () => {
            if (props.onAfterRefresh) {
                props.onAfterRefresh();
            }
        })
    }, [props, requestParams, downloadData, updateStatusSeachAndFilter])

    // ищем свойства shorthotkey у MenuItem, после этого вызываем onClick
    const handleHotKey = (event, record) => {
        const checkHotKey = (hotKey) => {
            return event.ctrlKey == !!hotKey.ctrlKey &&
                event.altKey == !!hotKey.altKey &&
                event.shiftKey == !!hotKey.shiftKey &&
                event.keyCode == hotKey.keyCode;
        }
        const handleInChildren = (children) => {
            return React.Children.map(children, mi => {
                if (mi.props && mi.props.shorthotkey && checkHotKey(mi.props.shorthotkey)) {
                    return mi;
                }
                if (mi.props && mi.props.children) {
                    return handleInChildren(mi.props.children);
                }
            })
        }
        if (props.recordMenu) {
            const mi = handleInChildren(props.recordMenu(record).props.children);
            if (mi.length > 0) {
                event.preventDefault();
                event.stopPropagation();
                mi[0].props.onClick(event, undefined, record, {});
            }
        }
    }

    const deleteData = React.useCallback(() => {
        let ids = selectRows.join(',');
        confirm(format(MSG_CONFIRM_DELETE, selectRows.length), () => {
            console.log("Delete record " + ids);
            requestToAPI.post(props.uri.forDelete, ids.split(","))
                .then(response => {
                    // финализация выполнения
                    refreshData();
                    notification.success({
                        message: MSG_DELETE_SUCCESS
                    })
                    if (props.onAfterDelete) {
                        props.onAfterDelete();
                    }
                })
                .catch(error => {
                    notification.error({
                        message: MSG_DELETE_ERROR,
                        description: error.message
                    })
                    if (props.onAfterDelete) {
                        props.onAfterDelete();
                    }
                })
        })
    }, [props, selectRows, refreshData])


    React.useEffect(() => {
        contextParams.mountFlag = true;
        if (!data && props.autoRefresh) {
            setData([]); // важно, иначе начальный refresh выполняется несколько раз
            refreshData();
        }
        // размонтирования компонента сбросит флаг
        return () => contextParams.mountFlag = false;
    }, [data, props.autoRefresh, refreshData, contextParams]);

    // для нормальной сортировки нужно установить handleHeaderClick
    React.useEffect(() => {
        // робочный эффект вызывается слишком рано. не все олонки фсормированы
        setTimeout(() => {
            // например, при прямой ссылке на модуль и дальнейшем появлении окна логирования этот код срабатывает
            // но монтирование таблицы было отменено
            if (refOuter.current) {
                const columns = refOuter.current.getElementsByClassName("ant-table-column-has-sorters");
                for (let c of columns) {
                    c.onclick = (ev) => handleHeaderClick(ev, c);
                }
            }
        }, 100);

    }, [handleHeaderClick, columns])

    const request = React.useCallback((pagination, filters, sorter) => {
        requestParams.sort = buildSortFromColumns(sorter);
        requestParams.pagination.current = pagination.current;
        requestParams.pagination.pageSize = pagination.pageSize;
        refreshData();
    }, [requestParams, refreshData])

    const setQuickFilters = React.useCallback((column, value, suffix,record) => {
        // если есть column.getDataIndex то имя колонки может быть динамическим
        const fldIndex = column.getDataIndex?column.getDataIndex(record):column.dataIndex;
        // если имя колонки динамическое, то и значение, кроме like, нужно перевычислить
        if(column.getDataIndex && suffix !== FILTER_TAG_LIKE) {
            value = record[fldIndex];
        }
        // вычисляем саму операцию и значение
        let oper = suffix;
        if(value === undefined || value === null) {
            const notFlag = suffix == FILTER_TAG_NEQ;
            oper = FILTER_TAG_ISNULL;
            value = notFlag?false:true;
        }

        const keyFilter = "quick." + fldIndex + "." + oper;
        // вызов трансформера, если есть. старое значение перепишем новым
        if (transformerQuickFilters) {
            const newvalue = transformerQuickFilters(column, value);
            if (newvalue) {
                value = newvalue;
            }
        }
        requestParams.filters[keyFilter] = value;
        filterColumns[keyFilter] = column;
        refreshData();
    }, [requestParams, filterColumns, refreshData, transformerQuickFilters])

    const removeQuickFilters = React.useCallback((ev) => {
        let key = ev.target.parentNode.parentNode.id;
        if (key == "") {
            key = ev.target.parentNode.parentNode.parentNode.id;
        }
        delete requestParams.filters[key];
        delete filterColumns[key];
        refreshData();
    }, [refreshData, filterColumns, requestParams.filters])

    const removeAllQuickFilters = React.useCallback((ev) => {
        Object.keys(requestParams.filters)
            .filter(key=>key.startsWith("quick."))
            .forEach(key=>{
                delete requestParams.filters[key];
                delete filterColumns[key];
            })
        refreshData();
    }, [refreshData, filterColumns, requestParams.filters])

    const filterOperationName =(filterKey,value)=>{
        return filterKey.endsWith("."+FILTER_TAG_EQ) ? " = " : 
                    filterKey.endsWith("."+FILTER_TAG_NEQ) ? " <> " :
                        filterKey.endsWith("."+FILTER_TAG_LIKE)? " содержит ":
                            filterKey.endsWith("."+FILTER_TAG_ISNULL)?value?"[ не определен ]":" [ определен ] ":
                            " [ ? ] "
    }

    const buildTitle = React.useCallback(() => {
        let qfilters = [];
        for (const key in requestParams.filters) {
            if (key.startsWith("quick.")) {
                const column = filterColumns[key];
                let value = requestParams.filters[key];
                if (column.renderForFilter) {
                    value = column.renderForFilter(value);
                }
                qfilters.push({
                    key: key,
                    title: column.title,
                    value: value,
                    oper: filterOperationName(key,value),
                    operTag: key.substring(key.lastIndexOf('.') + 1)
                });
            }
        }
        return qfilters.length > 0 ?
            () => <div><span style={{ marginLeft: 8, marginRight: 16 }}>Быстрый фильтр:</span>
                {qfilters.map(f => <Tag id={f.key} key={f.key} color="blue" closable onClose={removeQuickFilters}>
                    {f.title}{f.oper}{f.operTag == FILTER_TAG_LIKE ? "[" : ""}{f.value}{f.operTag == FILTER_TAG_LIKE ? "]" : ""}</Tag>)
                }
                {props.quickFilterResetButtonVisible?
                    <CloseCircleOutlined className='filter-panel-close-btn' style={{ dispay: "inline" }} onClick={removeAllQuickFilters} />
                    :""
                }    
            </div>
            : undefined;
    }, [filterColumns, requestParams.filters, removeQuickFilters,props.quickFilterResetButtonVisible,removeAllQuickFilters]);

    const rowSelection = {
        type: props.selectType,
        selectedRowKeys: selectRows,
        onChange: (rows) => {
            setSelectRows([...rows]);
        },
        selections: [
            Table.SELECTION_ALL,
            Table.SELECTION_INVERT,
            {
                key: 'Reset',
                text: 'Убрать все отметки',
                onSelect: changableRowKeys => {
                    setSelectRows([]);
                }
            }
        ]
    };

    React.useEffect(() => {
        if (props.onSelectedChange != null) {
            props.onSelectedChange(selectRows);
        }
    }, [selectRows]); // eslint-disable-line

    const callForm = React.useCallback((record, event) => {
        if (event.altKey) {
            event.preventDefault();
            event.stopPropagation();
            const column = props.columns[getTableTD(event.target).cellIndex - 1];
            if (column && !column.disableQuickFilter) {
                const isDateColumn = column.render==drawDate || column.render==drawDateAndTime || 
                    (column.dataType && (column.dataType==ColumnTypes.DATE || column.dataType==ColumnTypes.DATETIME));
                if (event.ctrlKey && !isDateColumn) {
                    inputValue(`Быстрый фильтр по полю "${column.title}"`,
                        "Часть текста, которая должна содержаться в данных",
                        (val) => setQuickFilters(column, val, FILTER_TAG_LIKE,record));
                } else {
                    setQuickFilters(column, record[column.dataIndex], FILTER_TAG_EQ,record);
                }
            }
        } else {
            if (props.editable) {
                props.editCallBack(record);
            } else {
                if (props.selectable && props.selectType == "radio") {
                    setSelectRows([record[props.idName]]);
                }
            }
        }
    }, [props, setQuickFilters])

    // interface содержит методы, которые можно применять к функциональному компоненту 
    // в стиле компонента, построенного на классах
    if (props.interface) {
        props.interface.refreshData = refreshData;
        props.interface.isLoading = () => loading;
        props.interface.SetRows = (values) => {
            if (data.find(d => d["code"] == values[0])) {
                setSelectRows([...values]);
            }
        };

        props.interface.getSelectedRows = () => rowSelection.selectedRowKeys;
        props.interface.getSelectedRecords = () => rowSelection.selectedRowKeys.map(idValue => data.filter(r => idValue == r[idName])[0]);
        props.interface.deleteData = deleteData;
        props.interface.requestParams = requestParams;
        props.interface.insFirstRecord = (values) => {
            // добавляем в текущий пакет
            setData([values, ...data])
        };
        props.interface.updateRecord = (values) => {
            // изменяем в текущем пакете
            const updId = values[idName];
            data.filter(r => r[idName] == updId).forEach(r => Object.assign(r, values))
        };
        props.interface.getProperties = () => {
            return {
                props: props
            }
        };
        props.interface.exportData = (destType) => {
            // получение данных без страниц
            const paramsAllRecords = { ...requestParams };
            paramsAllRecords.pagination = { current: 1, pageSize: -1 };
            downloadData(paramsAllRecords, (response) => {
                const fname = props.uri.forSelect.replace('/', '_');
                const items = response.result
                switch (destType) {
                    // csv
                    case 1:
                        exportJsonToCVS(items, props.columns, fname + ".csv")
                        break;
                    // xls
                    case 2:
                        exportJsonToExcel(items, props.columns, fname + ".xlsx")
                        break;

                    default:
                        break;
                }
            })
        };
    }

    const getRowClass = React.useCallback((record) => {
        let clss = "editable-row" + (props.editable ? " table-editable-row" : "");
        const id = record[idName];
        if (props.updateRecords.find(r => r[idName] == id)) {
            clss += " table-update-row";
        }
        if (props.getRowClass) {
            clss += props.getRowClass(record) ?? "";
        }
        return clss;
    }, [idName, props]);

    const hideAllRecordMenu = () => {
        // у всей страницы сбрасываем видимость меню записи
        data.forEach(r => {
            const mnu = r["mnu"];
            if (mnu) {
                mnu.visibleMenuRecordPopover = false;
            }
        })
        forceUpdate();
    }
    const recordMenuFound = !!props.recordMenu;

    const menuRecordContent = (record) => (
        <Menu onClick={(ev) => hideAllRecordMenu()}>
            {props.recordMenu
                ? React.Children.map(props.recordMenu(record).props.children, mi => mi)
                : undefined}
        </Menu>
    )

    let servColumn;
    if (recordMenuFound) {
        servColumn = {
            dataIndex: "mnu",
            serv: true, // сервисная колонка
            sorter: false,
            width: "60px",
            render: (data, record) => {
                if (!data) {
                    record["mnu"] = {}
                    data = record["mnu"];
                }

                if (data.visibleMenuRecordPopover) {
                    document.addEventListener(`click`, function onClickOutside() {
                        hideAllRecordMenu();
                        document.removeEventListener(`click`, onClickOutside)
                    })
                }
                return <Popover visible={data.visibleMenuRecordPopover}
                    onVisibleChange={(value) => data.visibleMenuRecordPopover = value}
                    overlayClassName="table-record-menu"
                    placement="leftTop"
                    content={() => menuRecordContent(record)}
                    trigger="click">
                    <MoreOutlined className="row-menu-button" onClick={ev => {
                        ev.stopPropagation();
                        data.visibleMenuRecordPopover = true;
                        forceUpdate();
                    }} />
                </Popover>
            }
        }
    }

    const getColumns = React.useCallback(() => {
        return columns.map((col) => {
            if (!col.editable) {
                return col;
            }
            return {
                ...col,
                onCell: (record) => ({
                    record,
                    editable: col.editable,
                    dataIndex: col.dataIndex,
                    title: col.title,
                    editComponentName: col.editComponentName,
                    required: col.required ?? false,
                    handleSave: (values) => {
                        props.interface.updateRecord(values);
                        if (col.autoCheckRecord) {
                            if (values[col.dataIndex] !== undefined && values[col.dataIndex] !== null) {
                                // Установим отметку
                                if (props.interface.getSelectedRows().indexOf(values[idName]) === -1) {
                                    setSelectRows([...props.interface.getSelectedRows(), values[idName]]);
                                }
                            } else {
                                // Удалим отметку
                                if (props.interface.getSelectedRows().indexOf(values[idName]) !== -1) {
                                    let newSelectRows = props.interface.getSelectedRows();
                                    newSelectRows.splice(newSelectRows.indexOf(values[idName]), 1);
                                    setSelectRows([...newSelectRows]);
                                }
                            }
                        }                        
                        forceUpdate();
                    },
                }),
            };
        });
    }, [columns, props.interface, idName]);

    return <div ref={refOuter}>
        <Table rowKey={idName}
            locale={{
                emptyText: "Нет данных"
            }}
            columns={servColumn ? [...getColumns(), servColumn] : getColumns()}
            dataSource={data}
            loading={loading}
            rowClassName={getRowClass}
            pagination={requestParams.pagination}
            rowSelection={props.selectable ? rowSelection : undefined}
            expandedRowRender={expandedRowRender}
            title={buildTitle()}
            size={"middle"}
            showSorterTooltip={false}
            onRow={(record, rowIndex) => {
                return {
                    onClick: event => callForm(record, event),
                    onContextMenu: event => {
                        // system menu
                        if (event.ctrlKey) {
                            return
                        }
                        event.preventDefault();
                        document.addEventListener(`click`, function onClickOutside() {
                            setPopupState({ visible: false })
                            document.removeEventListener(`click`, onClickOutside)
                        })
                        setPopupState({
                            record,
                            columns,
                            visible: true,
                            x: event.clientX + 162 < window.innerWidth ? event.clientX : event.clientX - 162, // 162 - ширина всплывающего окна. Хардкод. В идеале нужно расчитывать
                            y: event.clientY,
                            tableInterface: props.interface,
                            statuses: props.statuses
                        })
                    },
                    onMouseEnter: event => {
                        // чтобы работал пробел для выделенной записи
                        const tr = event.target.parentNode || {};
                        const comp = tr.firstChild ? tr.firstChild.firstChild || {} : {};
                        if (comp.nodeName == "LABEL") {
                            const input = comp.firstChild.firstChild;
                            input.focus();
                            input.onkeydown = (eventKey) => handleHotKey(eventKey, record);
                        }
                    }
                };
            }}
            onChange={request}
            ref={ref}
            components={{
                body: {
                    row: EditableRow,
                    cell: EditableCell,
                }
            }}
            {...otherProps} />
        <PropertyesPopupMenu {...popupState} />
    </div>
});

DataTable.propTypes = {
    editable: PropTypes.bool,
    selectable: PropTypes.bool,
    selectType: PropTypes.string,
    uri: PropTypes.object,
    editCallBack: PropTypes.func,
    defaultFilters: PropTypes.object,
    autoRefresh: PropTypes.bool,
    interface: PropTypes.object,
    onBeforeRefresh: PropTypes.func,
    onAfterRefresh: PropTypes.func,
    onAfterDelete: PropTypes.func,
    updateRecords: PropTypes.array,
    idName: PropTypes.string,
    defaultSelectRows: PropTypes.bool,
    transformerQuickFilters:PropTypes.func,
    getRowClass: PropTypes.func,
    quickFilterResetButtonVisible:PropTypes.bool
}

DataTable.defaultProps = {
    editable: true,
    autoRefresh: true,
    selectable: true,
    selectType: "checkbox",
    updateRecords: [],
    idName: "id",
    defaultSelectRows: false,
    quickFilterResetButtonVisible:false
}

export default DataTable;