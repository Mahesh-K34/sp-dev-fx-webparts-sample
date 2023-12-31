import * as React from 'react';
import * as strings from 'AppInsightsDashboardWebPartStrings';
import styles from '../CommonControl.module.scss';
import { ChartControl, ChartType } from '@pnp/spfx-controls-react/lib/ChartControl';
import { AppInsightsProps } from '../../webparts/appInsightsDashboard/components/AppInsightsDashboard';
import { TimeSpan, TimeInterval, Segments } from '../enumHelper';
import SectionTitle from '../components/SectionTitle';
import CustomPivot from './CustomPivot';
import Helper from '../Helper';

import DataList from './DataList';
import { addDays, IColumn, PivotItem, Icon, DatePicker, css, Spinner, MessageBar, MessageBarType } from '@fluentui/react';
import { Dictionary, IPageViewDetailProps } from '../CommonProps';

import {map} from 'lodash'
import { ChartData, ChartOptions } from 'chart.js';

const today: Date = new Date(Date.now());
const startMaxDate: Date = addDays(today, -1);
const minDate: Date = addDays(today, -90);
const maxDate: Date = new Date(Date.now());

export interface IUserStatisticsProps {
    helper: Helper;
}

const UserStatistics: React.FunctionComponent<IUserStatisticsProps> = (props) => {

    const mainProps = React.useContext(AppInsightsProps);
    const [loadingChart, setLoadingChart] = React.useState<boolean>(true);
    const [loadingList, setLoadingList] = React.useState<boolean>(true);
    const [timespanMenus, setTimeSpanMenus] = React.useState<Dictionary<string>[]>([]);
    const [selTimeSpan, setSelTimeSpan] = React.useState<string>('');
    const [menuClick, setMenuClick] = React.useState<boolean>(false);
    const [noData, setNoData] = React.useState<boolean>(false);
    const [noListData, setNoListData] = React.useState<boolean>(false);
    const [chartData, setChartData] = React.useState<ChartData>(null);
    const [chartOptions, setChartOptions] = React.useState<ChartOptions>(null);
    const [startDate, setStartDate] = React.useState<Date>(null);
    const [endDate, setEndDate] = React.useState<Date>(null);
    const [listCols, setListCols] = React.useState<IColumn[]>([]);
    const [items, setItems] = React.useState<IPageViewDetailProps[]>([]);

    const _loadMenus = (): void => {
        const tsMenus: Dictionary<string>[] = props.helper.getTimeSpanMenu();
        setTimeSpanMenus(tsMenus);
        setSelTimeSpan(tsMenus[4].key);
    };
    const handleTimeSpanMenuClick = (item: PivotItem): void => {
        setMenuClick(true);
        setSelTimeSpan(item.props.itemKey);
        setStartDate(null);
        setEndDate(null);
    };
    const handleStartDateChange = (selDate: Date | null | undefined): void => {
        setStartDate(selDate);
    };
    const handleEndDateChange = (selDate: Date | null | undefined): void => {
        setEndDate(selDate);
    };
    const _loadUserStatistics = async (): Promise<void> => {
        if (menuClick) setLoadingChart(true);
        let query: string = ``;
        if (startDate && endDate) {
            query = `
                union pageViews,customEvents
                | where timestamp between(datetime("${props.helper.getQueryStartDateFormat(startDate.toUTCString())}")..datetime("${props.helper.getQueryDateFormat(endDate.toUTCString())}"))
                | summarize Users=dcount(user_Id) by bin(timestamp, 1h)
                | order by timestamp asc
            `;
        } else {
            query = `
                union pageViews,customEvents
                | summarize Users=dcount(user_Id) by bin(timestamp, 1h)
                | order by timestamp asc
            `;
        }
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response: any[] = await props.helper.getResponseByQuery(query, (startDate && endDate) ? false : true, TimeSpan[selTimeSpan as keyof typeof TimeSpan]);
        if (response.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const results: any[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            response.map((res: any) => {
                results.push({
                    oriDate: res[0],
                    date: props.helper.getLocalTime(res[0]),
                    sum: res[1]
                });
            });
            const data: ChartData = {
                labels: map(results, 'date'),
                datasets: [
                    {
                        label: 'Total Users',
                        fill: true,
                        tension:0,
                        data: map(results, 'sum'),
                    }
                ]
            };
            setChartData(data);
            const options :ChartOptions= {
                responsive: true,
                animation: {
                    easing: 'easeInQuad'
                },
                plugins:{
                    legend: {
                        display: false
                    },
                    title: {
                        display: false,
                        text: ""
                    },
                },
                scales:{
                    y: {
                        min:0
                    }
                }
            };
            setChartOptions(options);
            setLoadingChart(false);
            setMenuClick(false);
        } else {
            setLoadingChart(false);
            setNoListData(true);
            setMenuClick(false);
        }
    };

    const _generateColumns = ():void => {
        const cols: IColumn[] = [];
        cols.push({
            key: 'user', name: 'User', fieldName: 'user', minWidth: 100, maxWidth: 150,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onRender: (item: any, index: number, column: IColumn) => {
                return (
                    <div className={styles.textWithIcon}>
                        {item.user ? (
                            <span>{item.user}</span>
                        ) : (
                            <span>{strings.Msg_NoUser}</span>
                        )}
                    </div>
                );
            }
        });
        cols.push({
            key: 'Url', name: 'Url', fieldName: 'Url', minWidth: 100, maxWidth: 350,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onRender: (item: any, index: number, column: IColumn) => {
                return (
                    <div className={styles.textWithIcon}>
                        <div className={styles.fileiconDiv}>
                            <Icon iconName="FileASPX" aria-label={item.Url}/>
                        </div>
                        {item.Url ? (
                            <a href={item.Url} target="_blank" className={styles.pageLink}>{item.Url}</a>
                        ) : (
                            <span>{strings.Msg_NoUrl}</span>
                        )}
                    </div>
                );
            }
        });
        cols.push({
            key: 'count', name: 'View Count', fieldName: 'count', minWidth: 100, maxWidth: 150
        });
        setListCols(cols);
    };

    const _loadUsersPageViewsList = async (): Promise<void> => {
        if (menuClick) setLoadingList(true);
        let response: IPageViewDetailProps[] = [];
        if (startDate && endDate) {
            response = await props.helper.getUserPageViews(`${props.helper.getFormattedDate(startDate.toUTCString(), 'YYYY-MM-DD')}/${props.helper.getFormattedDate(addDays(endDate, 1).toUTCString(), 'YYYY-MM-DD')}`,
                TimeInterval["1 Hour"], [Segments.Cust_UserTitle, Segments.PV_URL]);
        } else {
            response = await props.helper.getUserPageViews(TimeSpan[selTimeSpan as keyof typeof TimeSpan], TimeInterval["1 Hour"], [Segments.Cust_UserTitle, Segments.PV_URL]);
        }
        if (response.length > 0) {
            _generateColumns();
            setItems(response);
            setLoadingList(false);
            setMenuClick(false);
        } else {
            setLoadingList(false);
            setNoData(true);
            setMenuClick(false);
        }
    };

    React.useEffect((): void => {
        const fetchData= async(selTimeSpan:string, startDate:Date, endDate:Date): Promise<void>=>{
            if (selTimeSpan || (startDate && endDate)) {
                setNoData(false);
                setNoListData(false);
                await _loadUserStatistics();
                await _loadUsersPageViewsList();
            }
        }
        fetchData(selTimeSpan, startDate, endDate)
            .catch(console.error);  

    }, [selTimeSpan, startDate, endDate]);

    React.useEffect(():void => {
        if (props.helper) {
            _loadMenus();
        }
    }, [mainProps.AppId, mainProps.AppKey, props.helper]);

    return (
        <div>
            <SectionTitle Title={strings.SecTitle_UserStats} />
            <div style={{ display: 'flex', padding: '5px' }}>
                <div className={styles.centerDiv}>
                    <CustomPivot ShowLabel={true} LabelText={strings.Menu_TimeSpan} Items={timespanMenus} SelectedKey={selTimeSpan} OnMenuClick={handleTimeSpanMenuClick} />
                    <div className={"ms-Grid-row"} style={{ display: 'inline-flex', marginTop: '-5px', marginLeft: '10px' }}>
                        <label className={styles.dataLabel} style={{ paddingTop: '5px' }}>{"Date Range: "}</label>
                        <div style={{ paddingRight: '5px' }}>
                            <DatePicker
                                isRequired={false}
                                placeholder="Start Date..."
                                ariaLabel="Select start date"
                                minDate={minDate}
                                maxDate={startMaxDate}
                                allowTextInput={false}
                                highlightSelectedMonth={true}
                                initialPickerDate={startMaxDate}
                                formatDate={(date?: Date) => { return props.helper.getFormattedDate(date.toUTCString()); }}
                                onSelectDate={handleStartDateChange}
                                value={startDate}
                            />
                        </div>
                        <div>
                            <DatePicker
                                isRequired={false}
                                placeholder="End Date..."
                                ariaLabel="Select end date"
                                minDate={minDate}
                                maxDate={maxDate}
                                allowTextInput={false}
                                highlightSelectedMonth={true}
                                formatDate={(date?: Date) => { return props.helper.getFormattedDate(date.toUTCString()); }}
                                onSelectDate={handleEndDateChange}
                                value={endDate}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div className={css("ms-Grid-row", styles.content)}>
                <div className={"ms-Grid-col ms-xxxl6 ms-xxl6 ms-xl6 ms-lg6"}>
                    {loadingList ? (
                        <Spinner label={strings.Msg_LoadList} labelPosition={"bottom"} />
                    ) : (
                        <>
                            {!noListData ? (
                                <DataList Items={items} Columns={listCols} GroupBy={true} GroupByCol={"date"} CountCol={"count"} />
                            ) : (
                                <MessageBar messageBarType={MessageBarType.error}>{strings.Msg_NoData}</MessageBar>
                            )}
                        </>
                    )}
                </div>
                <div className={"ms-Grid-col ms-xxxl6 ms-xxl6 ms-xl6 ms-lg6"} style={{ minHeight: '358px' }}>
                    {loadingChart ? (
                        <Spinner label={strings.Msg_LoadChart} labelPosition={"bottom"} />
                    ) : (
                        <>
                            {!noData ? (
                                <ChartControl
                                    type={ChartType.Bar}
                                    data={chartData}
                                    options={chartOptions}
                                    className={styles.chart}
                                />
                            ) : (
                                <MessageBar messageBarType={MessageBarType.error}>{strings.Msg_NoData}</MessageBar>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserStatistics;