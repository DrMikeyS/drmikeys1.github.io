
function fetchData(url) {
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        });
}

function processData(hourlyData) {
    if ('apparent_temperature' in hourlyData) {
        // Process apparent_temperature data
        const hourlyApparentTemperature = hourlyData.apparent_temperature;
        const hourlyMembers = Object.keys(hourlyData).filter(key => key.startsWith('apparent_temperature_member'));
        const hourlyTime = hourlyData.time.map(time => new Date(time));
        const processedData = hourlyTime.map((time, index) => {
            const dataObject = {
                time: time.toISOString(),
                apparent_temperature: hourlyApparentTemperature[index]
            };
            hourlyMembers.forEach(memberKey => {
                const memberIndex = parseInt(memberKey.split('apparent_temperature_member')[1]) - 1;
                dataObject[memberKey] = hourlyData[memberKey][index];
            });
            return dataObject;
        });

        const statistics = processedData.map(interval => {
            const memberValues = hourlyMembers.map(memberKey => interval[memberKey]);
            const nonMemberValue = interval['apparent_temperature'];
            const valuesToInclude = [nonMemberValue, ...memberValues.filter(val => !isNaN(val))];
            const mean = valuesToInclude.reduce((sum, val) => sum + val, 0) / valuesToInclude.length;
            const variance = valuesToInclude.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / valuesToInclude.length;
            const stdDev = Math.sqrt(variance);
            return {
                time: interval.time,
                mean: mean.toFixed(2),
                sd_plus: (mean + stdDev).toFixed(2),
                sd_minus: (mean - stdDev).toFixed(2)
            };
        });

        return statistics;
    } else if ('weather_code' in hourlyData) {
        // Process weather_code data
        const hourlyWeatherCode = hourlyData.weather_code;
        const hourlyMembers = Object.keys(hourlyData).filter(key => key.startsWith('weather_code_member'));
        const processedData = hourlyData.time.map((time, index) => {
            const dataObject = {
                time: time,
                weather_code: hourlyWeatherCode[index]
            };
            hourlyMembers.forEach(memberKey => {
                const memberIndex = parseInt(memberKey.split('weather_code_member')[1]) - 1;
                dataObject[memberKey] = hourlyData[memberKey][index];
            });
            return dataObject;
        });

        // Replace WMO codes with corresponding values for all weather_code_member properties
        hourlyMembers.forEach(memberKey => {
            processedData.forEach(interval => {
                const weatherCode = interval[memberKey];
                switch (weatherCode) {
                    //Clear
                    case 0:
                    case 1:
                    case 2:
                        interval[memberKey] = 3;
                        break;
                    //Heavy Cloud
                    case 3:
                        interval[memberKey] = 2;
                        break;
                    //Light rain
                    case 50:
                    case 51:
                    case 60:
                    case 61:
                    case 80:
                        interval[memberKey] = 1;
                        break;
                    //Heavy rain
                    case 52:
                    case 53:
                    case 62:
                    case 63:
                    case 81:
                    case 54:
                    case 55:
                    case 64:
                    case 65:
                    case 82:
                        interval[memberKey] = 0;
                        break;
                    default:
                        break;
                }
            });
        });


        const statistics = processedData.map(interval => {
            const memberValues = hourlyMembers.map(memberKey => interval[memberKey]);
            const nonMemberValue = interval['weather_code'];
            const valuesToInclude = [...memberValues.filter(val => !isNaN(val))];
            const mean = valuesToInclude.reduce((sum, val) => sum + val, 0) / valuesToInclude.length;
            const variance = valuesToInclude.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / valuesToInclude.length;
            const stdDev = Math.sqrt(variance);
            return {
                time: interval.time,
                mean: mean.toFixed(2),
                sd_plus: (mean + stdDev).toFixed(2),
                sd_minus: (mean - stdDev).toFixed(2)
            };
        });

        return {
            statistics: statistics,
            raw: processedData
        }
            ;
    } else {
        throw new Error('Invalid hourly data format');
    }
}



function createChart(metricType, labels, meanData, plusOneSdData, minusOneSdData,
    chartID, boxes = null, yLabels = null, yMinMax = null, xlabelOffset = 0) {
    const ctx = document.getElementById(chartID).getContext('2d');


    // Get current time
    const currentTime = new Date();
    const chartLabels = labels.map(label => new Date(label)); // Convert labels to Date objects


    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: metricType,
                    data: meanData,
                    borderColor: 'red',
                    fill: false,
                    pointStyle: false
                },
                {
                    label: 'Mean + 1 SD',
                    data: plusOneSdData,
                    borderColor: '#F4C2C2',
                    fill: false,
                    borderWidth: 1,
                    pointStyle: false
                },
                {
                    label: 'Mean - 1 SD',
                    data: minusOneSdData,
                    borderColor: '#F4C2C2',
                    fill: '-1',
                    backgroundColor: 'rgb(244, 194, 194,0.6)',
                    borderWidth: 1,
                    pointStyle: false
                }
            ]
        },
        options: {
            plugins: {
                legend: {
                    display: false
                },
            },
            elements: {
                line: {
                    tension: 0.2
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            'day': 'ddd D'
                        },
                        unit: 'day'
                    },
                    ticks: {
                        labelOffset: xlabelOffset
                    }
                },
                y: {
                    title: {
                        display: false
                    },
                }
            }

        }
    });

    // Initialize annotations as an empty array
    const annotations = [];

    // Add current time line annotation
    annotations.push({
        type: 'line',
        scaleID: 'x',
        value: currentTime,
        borderColor: 'rgba(128, 128, 128, 0.7)', // Grey color
        borderWidth: 1,
        borderDash: [5, 5], // Dashed line
        label: {
            content: 'Current Time',
            enabled: true,
            position: 'top'
        }
    });

    if (boxes) {
        boxes.forEach(box => {
            annotations.push({
                type: 'box', //type of draw
                drawTime: 'beforeDraw', //this will decide background or foreground
                yMin: box.yMin, //value min on y axis
                yMax: box.yMax, //value max on y axis
                borderWidth: 0, //oarder width for box
                backgroundColor: box.backgroundColor, //colour of the box
            })
        })
    }

    // Set the annotations in the chart options
    chart.options.plugins.annotation.annotations = annotations;

    if (yMinMax == 'computed') {
        let minY = Infinity;
        let maxY = -Infinity;

        // Iterate through datasets to find min and max values
        chart.data.datasets.forEach(dataset => {
            const data = dataset.data;
            const minVal = Math.min(...data);
            const maxVal = Math.max(...data);

            minY = Math.min(minY, minVal);
            maxY = Math.max(maxY, maxVal);
        });

        // Set min and max values on y-axis
        chart.options.scales.y.min = minY;
        chart.options.scales.y.max = maxY;
    } else if (yMinMax) {
        chart.options.scales.y.min = 0
        chart.options.scales.y.max = 3
    }

    if (yLabels) {
        chart.options.scales.y.ticks.callback = function (value, index, values) {
            // for a value (tick) equals to 8
            return yLabels[value];
            // 'jun,ior-dev' will be returned instead and displayed on your chart
        }
        chart.options.scales.y.ticks.maxRotation = 55
        chart.options.scales.y.ticks.minRotation = 55
        chart.options.scales.y.ticks.font = { size: 8 }
    }
    chart.update();

}



function generateTempChart(days = 3) {
    const url = 'https://ensemble-api.open-meteo.com/v1/ensemble?latitude=54.7768&longitude=-1.5757&hourly=apparent_temperature&forecast_days=' + days + '&models=icon_seamless';

    fetchData(url)
        .then(data => {
            var boxes = [
                {
                    //Very cold
                    yMin: -10,
                    yMax: 5,
                    backgroundColor: 'rgb(154, 173, 245)'
                },
                {
                    //Cold
                    yMin: 5,
                    yMax: 10,
                    backgroundColor: 'rgb(195, 206, 247)'
                },
                {
                    //Cool
                    yMin: 6,
                    yMax: 10,
                    backgroundColor: 'rgb(215, 222, 245)'
                },
                {
                    //Mild
                    yMin: 10,
                    yMax: 14,
                    backgroundColor: 'rgb(245, 236, 215)'
                },
                {
                    //Moderate
                    yMin: 14,
                    yMax: 18,
                    backgroundColor: 'rgb(252, 222, 151)'
                },
                {
                    //Warm
                    yMin: 18,
                    yMax: 25,
                    backgroundColor: 'rgb(250, 183, 150)'
                },
                {
                    //Hot
                    yMin: 25,
                    yMax: 40,
                    backgroundColor: 'rgb(245, 146, 98)'
                }
            ]
            const statistics = processData(data.hourly);
            const labels = statistics.map(interval => interval.time);
            const meanData = statistics.map(interval => interval.mean);
            const plusOneSdData = statistics.map(interval => interval.sd_plus);
            const minusOneSdData = statistics.map(interval => interval.sd_minus);
            var offset;
            if (days == 3) {
                offset = 54
            } else {
                offset = 22
            }
            createChart('Mean Apparent Temperature', labels, meanData, plusOneSdData, minusOneSdData, 'tempChart', boxes, null, 'computed', offset);
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
}


function generateWeatherCodeChart(days = 3) {
    const url = 'https://ensemble-api.open-meteo.com/v1/ensemble?latitude=54.7768&longitude=-1.5757&hourly=weather_code&forecast_days=' + days + '&models=icon_seamless';

    fetchData(url)
        .then(data => {
            var boxes = [
                {
                    //Grey skies
                    yMin: 2,
                    yMax: 2.5,
                    backgroundColor: 'rgb(242, 244, 248)',
                },
                {
                    //Darker Grey skies
                    yMin: 1.25,
                    yMax: 2,
                    backgroundColor: 'rgb(200, 200, 200)'
                },
                {
                    //Light rain
                    yMin: 0.5,
                    yMax: 1.25,
                    backgroundColor: 'rgb(195, 206, 247)'
                },
                {
                    //Heavy rain
                    yMin: 0,
                    yMax: 0.5,
                    backgroundColor: 'rgb(154, 173, 245)'
                }
            ]
            var yLabels = {
                0: 'H. Rain', 1: 'L. Rain', 2: 'Cloudy', 3: 'Clear'
            }
            const statistics = processData(data.hourly)['statistics'];
            const labels = statistics.map(interval => interval.time);
            const meanData = statistics.map(interval => interval.mean);
            const plusOneSdData = statistics.map(interval => interval.sd_plus);
            const minusOneSdData = statistics.map(interval => interval.sd_minus);
            var offset;
            if (days == 3) {
                offset = 54
            } else {
                offset = 22
            }
            createChart('WeatherCode', labels, meanData, plusOneSdData, minusOneSdData, 'chart', boxes, yLabels, true, offset);
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
}


// Get the URL parameters
const urlParams = new URLSearchParams(window.location.search);

// Get a specific parameter value
const days = urlParams.get('days');

// Example: If the URL is "http://example.com/page?param1=value1&param2=value2"
// Then paramValue will be "value1" if you're looking for 'param1'


generateTempChart(days)
generateWeatherCodeChart(days)