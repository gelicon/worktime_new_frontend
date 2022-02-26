import React from 'react';
import { Space, Collapse } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import { DesktopOrTabletScreen } from './Responsive';
import {savePreference,dropPreference,loadPreference,enumPreferences} from './PreferenceStorage';
import {
    makeToServer,
    extractValuesFromInitFilters, createFilterItem, normalizeInputValue,
    resetToInitValues
} from './FilterUtils';

const { Panel } = Collapse;


export const Primary = (props) => {
    return <React.Fragment>{props.children}</React.Fragment>
}

const buildKey=(key)=>"modfilter."+window.location.pathname.slice(1).replace("/",".")+"."+key;

const buildSectionFilter = (children)=>{
    let primaryFilters = [];
    let otherFilters = [];
    React.Children.map(children, c => {
        if (Primary.name == c.type.name) {
            React.Children.map(c.props.children, cc => primaryFilters.push(cc));
        } else {
            otherFilters.push(c);
        }
    });
    // если нет primary filters, а только other filters,
    // other становятся primary
    if (primaryFilters.length == 0 && otherFilters.length > 0) {
        primaryFilters = otherFilters;
        otherFilters = [];
    }
    return [primaryFilters,otherFilters];
}

export const FilterPanelExt = (props) => {
    // разбиваем по секциям
    const [primaryFilters,otherFilters] = buildSectionFilter(props.children.props.children);

    const [config] = React.useState(()=>{        
        let initconfig = extractValuesFromInitFilters(props.initValues);
        // читаем предпочтения пользователей, если есть props storeFilter
        if(props.storeFilter) {
            const prefix = buildKey("");
            enumPreferences(key=>{
                if(key.startsWith(prefix)) {
                    const filterKey = key.slice(prefix.length);
                    // для чтения надо чтобы фильтр был в storeFilter
                    if(props.storeFilter[filterKey]) {
                        let prefval = loadPreference(key);
                        console.log("load filter from session key=",key,"value=", prefval);

                        // плохое компромисное решение!
                        // это нужно для того чтобы изменить значения начального фильтра в модуле
                        // props.initValues неизменна, но ее содержимое может меняться
                        props.initValues[filterKey]=prefval;

                        // трансформируем, если это необходимо
                        const storedesk = props.storeFilter[filterKey];
                        prefval = storedesk.transformValue?storedesk.transformValue(prefval):prefval;
                        initconfig[filterKey]=prefval;

                    }
                }
            })
        }
        return initconfig;
    });
    const [refs] = React.useState({});
    // строгая перезагрузка с размотированием компонент
    const [hardRefresh, setHardRefresh] = React.useState(false);
    React.useEffect(() => { setHardRefresh(false) }, [hardRefresh]);

    const changed = React.useCallback((key, val, option) => {
        
        let storeval = normalizeInputValue(val);
        // Исключение для DataLookup!
        // option появляется из DataLookup
        if(option && val) {
            storeval = {
                initValue:{
                    value:option.id,
                    title:option.value
                }
            }
        };        
        // сохраняем в предпочтениях
        if(props.storeFilter && props.storeFilter[key]) {
            console.log("save filter to session: key=",key," value=",storeval);
            savePreference(buildKey(key),storeval);
            // если сбросили значение фильтра, его нужно очистить в initFilters
            if(!val) {
                delete props.initValues[key];
            }
        }        
        config[key] = normalizeInputValue(val);
        props.onChange(makeToServer(config));

    }, [config, props])

    const genExtra = React.useCallback((refs) => (
        <CloseCircleOutlined style={{ dispay: "inline" }} onClick={event => {
            // удаляем все из предпочтений
            dropPreference(Object.keys(config).map(k=>buildKey(k)));

            event.stopPropagation();
            resetToInitValues(refs, config, props.factoryInitValues || props.initValues);
            // заменим содержимое в initValues
            Object.keys(props.initValues).forEach((key)=>{delete props.initValues[key]});
            Object.keys(config).forEach((key)=>{props.initValues[key]=config[key]});            

            // обновление
            props.onChange(makeToServer(config));

            // необходимо размонтировать, 
            // чтобы default значения у компонент вступили в действия 
            setHardRefresh(true);
        }} />
    ), [config, props]);

    const createInnerItems = React.useCallback((items) => {
        return (
            <>
                {items.map((c, index) => {
                    if(c.type == Space) {
                        const { children, ...otherProps } = c.props;
                        if (children) {
                            otherProps.children = createInnerItems(children);
                        }
                        otherProps.key = index;
                        return React.createElement(Space, otherProps);
                    } else if (typeof c.type != "string") { // отсекаем не компоненты, для тегов span, div и т.д. это не нужно
                        return createFilterItem(c, refs, props.initValues, changed);
                    } else {
                        return React.cloneElement(c, { key: "" });
                    }
                })}
            </>
        )
    }, [refs, changed,props.initValues]);

    const buildPanel = React.useCallback((filters) => {
        return <Space onClick={ev => ev.stopPropagation()} wrap>
            {filters
                .map((c, index) => {
                    if(c.type == Space) {
                        const { children, ...otherProps } = c.props;
                        if (children) {
                            otherProps.children = createInnerItems(children);
                        }
                        otherProps.key = index;
                        return React.createElement(Space, otherProps);
                    } else if (typeof c.type != "string") { // отсекаем не компоненты, для тегов span, div и т.д. это не нужно
                        return createFilterItem(c, refs, props.initValues, changed);
                    } else {
                        return React.cloneElement(c, { key: "" });
                    }
                })}
        </Space>
    }, [ refs, changed, createInnerItems,props.initValues]);

    const collapsible = otherFilters.length == 0 ? "header" : "";

    if (primaryFilters.length === 0 && otherFilters.length === 0)
        return null
    else
        return <DesktopOrTabletScreen>
            <Collapse expandIconPosition={"right"} collapsible={collapsible} bordered={false}>
                {!hardRefresh ?
                    <Panel header={buildPanel(primaryFilters)}
                        extra={genExtra(refs)}
                        showArrow={otherFilters.length > 0}
                        className={otherFilters.length > 0 ? "pad64" : null}>
                        <Space className="filter-panel">
                            {buildPanel(otherFilters)}
                        </Space>
                    </Panel>
                    : ""}
            </Collapse>
        </DesktopOrTabletScreen>

}

