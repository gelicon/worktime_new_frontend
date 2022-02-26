import React from 'react';
import PropTypes from 'prop-types';
import { AutoComplete, Input, Button } from 'antd';
import { EllipsisOutlined, SearchOutlined, MailOutlined } from '@ant-design/icons';
import { MSG_REQUEST_ERROR, DEBOUNCE_TIMEOUT } from './Const';
import { notification } from 'antd';
import requestToAPI from "./Request";
import { debounce, groupBy } from "./Utils";


const convertFromResponse = (resp, renderTitleGroup, renderItem) => {
    if (renderTitleGroup) {
        // группируем по parentId
        const grouped = groupBy(resp, "parentId");
        let result = Object.keys(grouped).map(k => {
            const item0 = grouped[k][0];
            return {
                label: renderTitleGroup(item0),
                options: grouped[k].map(g => renderItem(g))
            };
        })
        return result;
    } else {
        return resp.map(g => renderItem(g));
    }
}

const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
}

let refreshDataHandle = 0;

const DataLookup = React.forwardRef((props, ref) => {
    const { uri, defaultValue, placeholder, onChange,
        onDictonaryClick, renderItem, renderGroup, params, ...otherprops } = props;

    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [dropDownFlag, setDropDownFlag] = React.useState(false);
    const inputRef = React.useRef(null);
    const [value, setValue] = React.useState({});

    const refreshData = React.useCallback((val, handle) => {
        setLoading(true);
        requestToAPI.post(props.uri, { search: val, ...params })
            .then(response => {
                if (handle && handle !== refreshDataHandle) return;
                setLoading(false);
                setData(convertFromResponse(response, renderGroup, renderItem));
            })
            .catch(error => {
                if (handle && handle !== refreshDataHandle) return;
                setLoading(false);
                // в случае ошибки
                setData([]);
                notification.error({
                    message: MSG_REQUEST_ERROR,
                    description: error.message
                })
            })
        // eslint-disable-next-line
    }, [props.uri])

    const handleRefresh = () => {
        if (value && value.title) {
            refreshData(value.title);
        }
    }

    // это нужно сделать, чтобы debounce не создавал на каждый введенный символ новую функцию
    const [debounceHelper] = React.useState({ func: debounce(refreshData, DEBOUNCE_TIMEOUT) });
    const debounceRefreshData = debounceHelper.func;

    const handleSearch = (value) => {
        if (value && value.length > 3) {
            refreshDataHandle = getRandomInt(Number.MAX_SAFE_INTEGER);
            debounceRefreshData(value, refreshDataHandle);
        }
    };

    if (props.value && props.value.value && !data) {
        setData([{
            id: props.value.value,
            key: props.value.value,
            value: props.value.title,
            label: <div><span>{props.value.title}</span></div>
        }]);
    }

    const handleChange = React.useCallback((val, options) => {
        setDropDownFlag(false);
        if (props.onSelect) {
            props.onSelect(val, options);
        }
    }, [props])

    const handleDictonaryClick = React.useCallback((ev) => {
        setDropDownFlag(false);
        if (onDictonaryClick) {
            onDictonaryClick((okFlag, selectValueObject) => {
                inputRef.current.focus({
                    cursor: 'end',
                });
                if (okFlag) {
                    const opt = renderItem(selectValueObject);
                    setData([opt]);
                    setValue({ value: opt.id, title: opt.value, additional: opt.additional });
                    if (onChange) {
                        onChange({ value: opt.id, title: opt.value, additional: opt.additional });
                    }
                }
            });
        }
        ev.stopPropagation(); // TODO не работает, разобраться
    }, [onDictonaryClick, renderItem, onChange]);

    const originalHandleChange = (val, options) => {
        if (!options) options = {};
        // реакция на нажатие clear
        if(val===undefined) {
            if (props.onSelect) {
                props.onSelect(val, options);
            }
        } else {
            setDropDownFlag(true);
        }
        if (onChange) {
            onChange({ value: options.id, title: options.value ?? val, additional: options.additional });
        } else {
            setValue({ value: options.id, title: options.value ?? val, additional: options.additional });
        }
    }

    const handleKeyDown = (ev) => {
        if (ev.keyCode >= 37 && ev.keyCode <= 40) {
            if (ev.ctrlKey && !ev.shiftKey) {
                handleDictonaryClick(ev);
            } else {
                if (ev.keyCode == 38 || ev.keyCode == 40) {
                    setDropDownFlag(true);
                }
            }
        };
        if (ev.keyCode == 27) {
            setDropDownFlag(false);
            ev.preventDefault();
        }
        if (ev.keyCode == 13) {
            if (dropDownFlag) {
                setDropDownFlag(false);
                ev.stopPropagation();
            }
        }

    }

    const extractDefaultValue = ()=>{
        if(defaultValue) {
            return defaultValue.title;
        }
        return (props.value && data && data.length > 0) ? data[0].value : undefined;
    }

    return <AutoComplete
        open={dropDownFlag}
        ref={ref}
        options={data || []}
        onSearch={handleSearch}
        defaultValue={extractDefaultValue()}
        onChange={originalHandleChange}
        onBlur={() => setDropDownFlag(false)}
        onKeyDown={handleKeyDown}
        notFoundContent="Данные не найдены. Уточните поиск"
        {...otherprops}
        value={value && Object.keys(value).length != 0 ? value.title : undefined}
        onSelect={(val, option) => handleChange(val, option)}
        defaultActiveFirstOption={true}
    >
        <Input.Search ref={inputRef} className="lookup"
            enterButton={<Button tabIndex={-1} icon={<SearchOutlined />} disabled
                style={props.disabled ? {} : { cursor: "default", backgroundColor: "white" }} />}
            addonAfter={onDictonaryClick ? <Button tabIndex={-1} className="lookup-button-dict"
                onClick={handleDictonaryClick} icon={<EllipsisOutlined />} disabled={props.disabled} /> : undefined}
            onSearch={handleRefresh}
            placeholder={placeholder}
            loading={loading} />
    </AutoComplete>
});

DataLookup.propTypes = {
    uri: PropTypes.string.isRequired,
    renderItem: PropTypes.func.isRequired,
    renderGroup: PropTypes.func,
    allowClear: PropTypes.bool,
    defaultValue: PropTypes.object
}

DataLookup.defaultProps = {
    style: { width: "100%" }
}

DataLookup.displayName = 'DataLookup';

DataLookup.ProgUser = React.forwardRef((props, ref) => {
    const renderTitleGroup = (item) => {
        return <span>{item.statusDisplay}</span>
    }

    const renderItem = (item) => {
        return {
            id: item.proguserId,
            key: item.proguserId,
            value: item.proguserName,
            label:
                <div>
                    <div>{item.proguserName} [{item.proguserFullname}]</div>
                    {item.proguserchannelAddress ?
                        <a href={"mailto:" + item.proguserchannelAddress}><div><MailOutlined /> {item.proguserchannelAddress}</div></a> :
                        <div><MailOutlined /> - </div>}
                </div>
        }
    }

    return <DataLookup ref={ref} uri={"admin/credential/proguser/find"}
        renderItem={renderItem}
        renderGroup={renderTitleGroup}
        {...props} />
});

DataLookup.ProgUser.displayName = 'DataLookup.ProgUser';

export default DataLookup;