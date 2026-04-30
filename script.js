const cityInput = document.getElementById('cityInput');
let cityOptions = document.getElementById('cityOptions');
const plannedStartDateInput = document.getElementById('plannedStartDate');
const numberOfDaysInput = document.getElementById('numberOfDays');
const getWeatherBtn = document.getElementById('getWeatherBtn');

let selectedCityLatitude;
let selectedCityLongitude;

// Function to fetch data from the API and populate city options
async function fetchCities(cityName) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${cityName}&count=5&language=en&format=json`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        const cities = data.results;

        // Clear previous options
        cityOptions.innerHTML = '';

        // Populate city options
        cities.forEach(city => {
            const option = document.createElement('a');
            option.textContent = `${city.name}, ${city.country}`;
            option.classList.add('list-group-item', 'list-group-item-action');
            option.href = '#';
            option.addEventListener('click', (event) => {
                event.preventDefault();
                selectCity(city);
            });
            cityOptions.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// Function to handle city selection
function selectCity(city) {
    console.log('Selected city:', city);
    // Store latitude and longitude as variables
    selectedCityLatitude = city.latitude;
    selectedCityLongitude = city.longitude;

    // Set the value of the city input to the selected city's name
    cityInput.value = `${city.name}, ${city.country}`;

    // You can perform any additional actions here with the selected city

    // Remove city options from the DOM
    while (cityOptions.firstChild) {
        cityOptions.removeChild(cityOptions.firstChild);
    }
}


// Event listener for input changes
cityInput.addEventListener('input', (event) => {
    const cityName = event.target.value.trim();
    if (cityName.length >= 3) {
        fetchCities(cityName);
    }

});

// Function to format date as YYYY-MM-DD for API call
function formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function fetchHistoricWeatherForMultipleYears(latitude, longitude, startDate, endDate) {
    const years = [startDate.getFullYear(), startDate.getFullYear() - 1, startDate.getFullYear() - 2, startDate.getFullYear() - 3, startDate.getFullYear() - 4, startDate.getFullYear() - 5, startDate.getFullYear() - 6, startDate.getFullYear() - 7, startDate.getFullYear() - 8, startDate.getFullYear() - 9];
    const promises = years.map(year => {
        const startOfYear = new Date(year, startDate.getMonth(), startDate.getDate());
        const endOfYear = new Date(year, endDate.getMonth(), endDate.getDate());
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startOfYear.toISOString().split('T')[0]}&end_date=${endOfYear.toISOString().split('T')[0]}&daily=temperature_2m_max,precipitation_hours`;
        console.log(url)
        return fetch(url)
            .then(response => response.json())
            .then(data => ({ year, data }));
    });

    return Promise.all(promises);
}

// Function to categorize rainfall duration
function categorizeRainfallDuration(rainfallHours) {
    if (rainfallHours < 2) {
        return 'Dry';
    } else if (rainfallHours < 6) {
        return 'Shower';
    } else {
        return 'Rainy';
    }
}

// Function to calculate the average number of days falling into each category
function calculateAverageRainfallCategories(historicWeatherData) {
    const totalYears = historicWeatherData.length;
    const rainfallCategories = {
        Dry: 0,
        Shower: 0,
        Rainy: 0
    };

    historicWeatherData.forEach(({ data }) => {
        data.daily.precipitation_hours.forEach(rainfallHours => {
            const category = categorizeRainfallDuration(rainfallHours);
            rainfallCategories[category]++;
        });
    });

    // Calculate averages
    const averageRainfallCategories = {};
    Object.keys(rainfallCategories).forEach(category => {
        averageRainfallCategories[category] = rainfallCategories[category] / totalYears;
    });

    return averageRainfallCategories;
}

// Function to calculate expected daily max temperature range
function calculateExpectedTemperatureRange(dailyMaxTemperatures) {
    // Calculate median daily max temperature
    const sortedTemperatures = dailyMaxTemperatures.flat().sort((a, b) => a - b);
    const medianIndex = Math.floor(sortedTemperatures.length / 2);
    const medianTemperature = sortedTemperatures.length % 2 === 0 ?
        (sortedTemperatures[medianIndex - 1] + sortedTemperatures[medianIndex]) / 2 :
        sortedTemperatures[medianIndex];

    // Calculate standard deviation of daily max temperatures
    const meanTemperature = dailyMaxTemperatures.flat().reduce((acc, val) => acc + val, 0) / dailyMaxTemperatures.flat().length;
    const squaredDifferences = dailyMaxTemperatures.flat().map(temp => Math.pow(temp - meanTemperature, 2));
    const variance = squaredDifferences.reduce((acc, val) => acc + val, 0) / squaredDifferences.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate expected range
    const lowerRange = medianTemperature - standardDeviation;
    const upperRange = medianTemperature + standardDeviation;

    return { lowerRange, upperRange };
}





// Event listener for "Get Historic Weather" button click
getWeatherBtn1.addEventListener('click', async () => {
    const plannedStartDate = plannedStartDateInput.value;
    const numberOfDays = parseInt(numberOfDaysInput.value, 10);

    // Calculate API start date (1 year before planned start date)
    const plannedStartDateObj = new Date(plannedStartDate);
    const APIStartDate = new Date(plannedStartDateObj.getFullYear() - 1, plannedStartDateObj.getMonth(), plannedStartDateObj.getDate());

    // Calculate API end date (API start date + number of days)
    const APIEndDate = new Date(APIStartDate);
    APIEndDate.setDate(APIEndDate.getDate() + numberOfDays);

    // Format dates for API call
    const formattedAPIStartDate = formatDate(APIStartDate);
    const formattedAPIEndDate = formatDate(APIEndDate);

    // Make API call using the calculated dates and selected city's latitude/longitude
    try {
        const historicWeatherData = await fetchHistoricWeatherForMultipleYears(selectedCityLatitude, selectedCityLongitude, APIStartDate, APIEndDate);
        console.log('Historic weather data:', historicWeatherData);

        // Calculate average number of days falling into each rainfall category
        const averageRainfallCategories = calculateAverageRainfallCategories(historicWeatherData);
        console.log('Average Rainfall Categories:', averageRainfallCategories);



        // Extract all dates for all years
        const allDates = historicWeatherData.map(({ year, data }) => data.daily.time);

        // Extract data for charts
        const allMaxTemperatures = historicWeatherData.map(({ year, data }) => data.daily.temperature_2m_max);
        const allRainfalls = historicWeatherData.map(({ year, data }) => data.daily.precipitation_hours);

        // Calculate expected daily max temperature range
        const expectedTemperatureRange = calculateExpectedTemperatureRange(allMaxTemperatures);
        console.log('Expected Daily Max Temperature Range:', expectedTemperatureRange);


        // Render temperature chart
        renderTemperatureChartForMultipleYears(allDates, allMaxTemperatures);

        displayTripInfo(expectedTemperatureRange, averageRainfallCategories, allMaxTemperatures);

        renderStackedBarChartForYears(allRainfalls, historicWeatherData)
    } catch (error) {
        console.error('Error fetching historic weather data:', error);
    }
});

// Function to calculate expected daily max temperature range
function calculateMaxTemperatureRange(dailyMaxTemperatures) {
    // Flatten the array of temperatures
    const allTemperatures = dailyMaxTemperatures.flat();
    console.log(allTemperatures)
    // Find the maximum and minimum temperatures
    const maxTemperature = Math.max(...allTemperatures);
    const minTemperature = Math.min(...allTemperatures);

    return { minTemperature, maxTemperature };
}


// Function to display trip information
function displayTripInfo(temperatureRange, rainfallCategories, allMaxTemperatures) {
    const expectedTemperatureRange = calculateMaxTemperatureRange(allMaxTemperatures);
    const tripInfoTableElement = document.getElementById('tripInfoTable');
    const dailyHigh = `${temperatureRange.lowerRange.toFixed(0)}-${temperatureRange.upperRange.toFixed(0)}°C`;
    const medianTemperature = calculateMedianTemperature(allMaxTemperatures).toFixed(0); // Calculate median temperature
    const totalDays = Object.values(rainfallCategories).reduce((acc, val) => acc + val, 0); // Calculate total days
    const dryDaysPercentage = ((rainfallCategories.Dry / totalDays) * 100).toFixed(0); // Calculate dry days percentage
    const showeryDaysPercentage = ((rainfallCategories.Shower / totalDays) * 100).toFixed(0); // Calculate showery days percentage
    const rainyDaysPercentage = ((rainfallCategories.Rainy / totalDays) * 100).toFixed(0); // Calculate rainy days percentage

    // Populate table cells
    document.getElementById('typicalDailyHighRange').textContent = dailyHigh;
    document.getElementById('maxDailyHigh').textContent = `${expectedTemperatureRange.maxTemperature.toFixed(0)}°C`;
    document.getElementById('minDailyHigh').textContent = `${expectedTemperatureRange.minTemperature.toFixed(0)}°C`;
    document.getElementById('medianDailyTemperature').textContent = `${medianTemperature}°C`; // Add median temperature row
    document.getElementById('typicalDryDays').textContent = `${dryDaysPercentage}%`;
    document.getElementById('typicalDaysWithShower').textContent = `${showeryDaysPercentage}%`;
    document.getElementById('typicalRainyDays').textContent = `${rainyDaysPercentage}%`;

    $("#tripInfoTableContainer").addClass('d-block').removeClass('d-none');
}


// Function to calculate the median temperature from the array of all maximum temperatures
function calculateMedianTemperature(allMaxTemperatures) {
    const flattenedTemperatures = allMaxTemperatures.flat(); // Flatten the array of temperatures
    const sortedTemperatures = flattenedTemperatures.sort((a, b) => a - b); // Sort the temperatures
    const medianIndex = Math.floor(sortedTemperatures.length / 2); // Find the index of the median temperature

    if (sortedTemperatures.length % 2 === 0) {
        // If the number of temperatures is even, calculate the average of the two middle temperatures
        return (sortedTemperatures[medianIndex - 1] + sortedTemperatures[medianIndex]) / 2;
    } else {
        // If the number of temperatures is odd, return the middle temperature
        return sortedTemperatures[medianIndex];
    }
}


// Function to generate a gradient of colors based on a single color
function generateColorGradient(baseColor, numSteps) {
    const colors = [];
    const colorStep = 1 / (numSteps - 1);
    for (let i = 0; i < numSteps; i++) {
        const opacity = 1 - (i * colorStep);
        const rgbaColor = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${opacity})`;
        colors.push(rgbaColor);
    }
    return colors;
}



var temperatureChart; // Declare temperatureChart variable

// Function to render temperature chart with data for multiple years
function renderTemperatureChartForMultipleYears(dates, temperatures) {
    const combinedDates = dates.flat().map(date => new Date(date)); // Combine dates from all years
    const parsedDates = [...new Set(combinedDates)]; // Use set to remove duplicates and convert back to array
    const numDataPoints = parsedDates.length; // Number of data points across all years
    const ctx = document.getElementById('temperatureChart').getContext('2d');
    const numYears = temperatures.length;

    // Destroy the previous chart if it exists
    if (temperatureChart) {
        temperatureChart.destroy();
    }

    // Calculate the median temperature line
    const medianTemperatures = temperatures.reduce((acc, temps) => {
        temps.forEach((temp, index) => {
            acc[index] = (acc[index] || 0) + temp;
        });
        return acc;
    }, []).map(tempSum => tempSum / numYears);

    // Create a new chart
    temperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({ length: numDataPoints }, (_, index) => index), // Use indices as labels
            datasets: [
                {
                    label: 'Median',
                    data: medianTemperatures,
                    borderColor: 'rgba(0, 0, 0, 0.8)', // Darker color for the median line
                    backgroundColor: 'rgba(0, 0, 0, 0)', // Transparent background
                    borderWidth: 2 // Increase the line width for better visibility
                },
                ...temperatures.map((temps, index) => ({
                    label: `${new Date(dates[index][0]).getFullYear()}`,
                    data: temps,
                    borderColor: `rgba(255, 99, 132, 0.5)`, // Same color for all years
                    backgroundColor: `rgba(255, 99, 132, 0.1)`, // Transparent background
                    borderWidth: 1 // Default line width
                }))
            ]
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Max Temperature (°C)',
                    },
                },
                x: {
                    title: {
                        display: false,
                    },
                    ticks: {
                        display: false, // Set display to false to remove x-axis labels
                    },
                    min: 0, // Set the minimum value of x-axis to 0
                    max: temperatures[0].length - 1, // Set the maximum value of x-axis to the last index
                }
            },
        },
    });
}



// Function to group wet, dry, and showery days for each year
function groupRainfallDays(rainfallData) {
    const groupedData = [];

    rainfallData.forEach(yearData => {
        let wetDays = 0;
        let showeryDays = 0;
        let dryDays = 0;

        yearData.forEach(rainfallHours => {
            if (rainfallHours >= 6) {
                wetDays++;
            } else if (rainfallHours >= 2) {
                showeryDays++;
            } else {
                dryDays++;
            }
        });

        groupedData.push({ wetDays, showeryDays, dryDays });
    });

    return groupedData;
}


// Function to render stacked bar chart for weather distribution of each year
function renderStackedBarChartForYears(rainfallData, historicWeatherData) {
    const barChartContainer = document.getElementById('barChartContainer');
    barChartContainer.innerHTML = ''; // Clear previous charts

    const groupedData = groupRainfallDays(rainfallData);
    const years = historicWeatherData.map(({ year }) => year); // Extract years from historic weather data

    const labels = years.map(year => year.toString()); // Convert years to strings for labels
    const wetData = groupedData.map(({ wetDays }) => wetDays);
    const showeryData = groupedData.map(({ showeryDays }) => showeryDays);
    const dryData = groupedData.map(({ dryDays }) => dryDays);

    const ctx = document.createElement('canvas');
    barChartContainer.appendChild(ctx);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Wet Days',
                    data: wetData,
                    backgroundColor: '#57a0e5'
                },
                {
                    label: 'Showery Days',
                    data: showeryData,
                    backgroundColor: '#b6d4f0'
                },
                {
                    label: 'Dry Days',
                    data: dryData,
                    backgroundColor: '#f7d06b'
                }
            ]
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Weather Distribution by Year'
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Year'
                    }
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Number of Days'
                    }
                }
            }
        }
    });
}

