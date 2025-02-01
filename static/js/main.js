let dataTable = null;

function extractNumber(str) {
    if (!str || str === 'N/A' || str === 'RENT WITHHELD') return -1;
    const match = str.match(/(\d+([,.]\d+)?)/);
    if (!match) return -1;
    return parseFloat(match[1].replace(/,/g, ''));
}

function extractPriceValue(priceStr) {
    if (!priceStr || priceStr === 'N/A') return -1;
    
    // Remove any 'per month' or 'SF/YR' suffixes
    priceStr = priceStr.replace(/(per month|SF\/YR)/g, '').trim();
    
    // If there's a range (e.g., "$375.00 - $112,500"), take the first number
    if (priceStr.includes('-')) {
        priceStr = priceStr.split('-')[0].trim();
    }
    
    // Extract the number, handling commas
    const match = priceStr.match(/\$?([\d,]+(?:\.\d+)?)/); 
    if (!match) return -1;
    
    // Convert to number, removing commas
    return parseFloat(match[1].replace(/,/g, ''));
}

// Custom sorting function for price
jQuery.extend(jQuery.fn.dataTableExt.oSort, {
    'price-pre': function(a) {
        return extractPriceValue(a);
    },
    'price-asc': function(a, b) {
        if (a === -1 && b === -1) return 0;  // Both are N/A
        if (a === -1) return 1;  // a is N/A, should be last
        if (b === -1) return -1; // b is N/A, should be last
        return ((a < b) ? -1 : ((a > b) ? 1 : 0));
    },
    'price-desc': function(a, b) {
        if (a === -1 && b === -1) return 0;  // Both are N/A
        if (a === -1) return 1;  // a is N/A, should be last
        if (b === -1) return -1; // b is N/A, should be last
        return ((a < b) ? 1 : ((a > b) ? -1 : 0));
    }
});

// Custom sorting function for square footage
jQuery.extend(jQuery.fn.dataTableExt.oSort, {
    'square-footage-pre': function(a) {
        return extractNumber(a);
    },
    'square-footage-asc': function(a, b) {
        return ((a < b) ? -1 : ((a > b) ? 1 : 0));
    },
    'square-footage-desc': function(a, b) {
        return ((a < b) ? 1 : ((a > b) ? -1 : 0));
    }
});

// Custom sorting function for price
jQuery.extend(jQuery.fn.dataTableExt.oSort, {
    'price-pre': function(a) {
        return extractPriceValue(a);
    },
    'price-asc': function(a, b) {
        return ((a < b) ? -1 : ((a > b) ? 1 : 0));
    },
    'price-desc': function(a, b) {
        return ((a < b) ? 1 : ((a > b) ? -1 : 0));
    }
});

// Custom sorting function for suites
jQuery.extend(jQuery.fn.dataTableExt.oSort, {
    'suites-pre': function(a) {
        return extractNumber(a);
    },
    'suites-asc': function(a, b) {
        return ((a < b) ? -1 : ((a > b) ? 1 : 0));
    },
    'suites-desc': function(a, b) {
        return ((a < b) ? 1 : ((a > b) ? -1 : 0));
    }
});

function formatPrice(price) {
    if (!price || price === 'N/A') return 'N/A';
    if (price === 'RENT WITHHELD') return price;
    return price;  // Keep the original format for display
}

function updateRecordCount(table) {
    const info = table.page.info();
    const totalRecords = info.recordsDisplay;
    const filteredText = info.recordsDisplay !== info.recordsTotal ? 
        ` (filtered from ${info.recordsTotal})` : '';
    $('#recordCount').text(`Showing ${totalRecords} properties${filteredText}`);
}

function initializeDataTable(data) {
    if (dataTable) {
        dataTable.destroy();
        $('#propertyTable').empty();
    }
    
    // Show the table wrapper when we have data
    $('.dataTables_wrapper').show();

    // Add or update record count element
    if (!$('#recordCount').length) {
        $('#tableContainer').prepend('<div id="recordCount" class="mb-3" style="font-weight: bold;"></div>');
    }

    if (!Array.isArray(data)) {
        console.error('Properties data is not an array:', data);
        showError('Invalid data format received');
        return;
    }

    dataTable = $('#propertyTable').DataTable({
        data: data,
        columns: [
            { 
                data: 'address', 
                title: 'Address'
            },
            { 
                data: 'price', 
                title: 'Price',
                render: function(data) {
                    return formatPrice(data);
                },
                type: 'price',
                orderData: [1]  // Sort by the price column
            },
            { 
                data: 'square_footage', 
                title: 'Square Footage',
                render: function(data) {
                    return data || 'N/A';
                },
                type: 'square-footage'
            },
            { 
                data: 'number_of_units', 
                title: 'Units Available',
                render: function(data) {
                    return data || 'N/A';
                },
                type: 'number'
            },
            {
                data: 'url',
                title: 'Listing URL',
                render: function(data) {
                    return data ? `<a href="${data}" target="_blank" rel="noopener noreferrer">View Listing</a>` : 'N/A';
                }
            },
            {
                data: 'contact_info',
                title: 'Contact Info',
                render: function(data) {
                    return data || 'N/A';
                }
            }
        ],
        order: [[1, 'asc']],  // Default sort by price ascending
        pageLength: 25,
        responsive: true,
        dom: 'Bfrtip',
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        drawCallback: function() {
            updateRecordCount(this.api());
        }
    });
}

// Define API base URL at the top of the file
const API_BASE_URL = 'https://shark-app-l8hmq.ondigitalocean.app';

function loadLatestData() {
    fetch(`${API_BASE_URL}/api/latest-data`)
        .then(response => response.json())
        .then(result => {
            if (result.success && result.data && result.data.properties) {
                if (result.data.properties.length > 0) {
                    initializeDataTable(result.data.properties);
                    $('#lastUpdate').text(new Date().toLocaleString());
                    $('#tableContainer').addClass('has-data');
                    $('.dataTables_wrapper').show();
                } else {
                    $('#lastUpdate').text('No data yet');
                    initializeEmptyDataTable();
                    $('#tableContainer').removeClass('has-data');
                }
            } else {
                initializeEmptyDataTable();
                $('#tableContainer').removeClass('has-data');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            initializeEmptyDataTable();
            $('#tableContainer').removeClass('has-data');
        });
}

function generateReport(event) {
    // Prevent default form submission if event exists
    if (event) {
        event.preventDefault();
    }
    
    const apiKey = $('#apiKeyInput').val().trim();
    if (!apiKey) {
        showError('Please enter your Firecrawl API key');
        return;
    }

    $('#generateBtn').prop('disabled', true);
    $('#progressContainer').show();
    $('#alertBox').hide();
    $('#tableContainer').removeClass('has-data');
    $('.dataTables_wrapper').hide();

    // Send API key with the request
    const requestData = { api_key: apiKey };
    
    // Start progress updates using polling
    let lastProgress = 0;
    let pollInterval;

    function pollProgress() {
        fetch(`${API_BASE_URL}/api/status`)
            .then(response => response.json())
            .then(data => {
                // Handle errors
                if (data.error) {
                    clearInterval(pollInterval);
                    showError('Error: ' + data.message);
                    $('#generateBtn').prop('disabled', false);
                    return;
                }
                
                // Update progress
                if (data.progress >= lastProgress) {
                    $('.progress-bar-fill').css('width', data.progress + '%');
                    $('.progress-message').text(data.message);
                    lastProgress = data.progress;
                }
                
                // When done, check for data
                if (data.done) {
                    clearInterval(pollInterval);
                    checkForData();
                }
            })
            .catch(error => {
                console.error('Error polling progress:', error);
                // Don't stop polling on network errors
            });
    }

    // Poll every 2 seconds
    pollInterval = setInterval(pollProgress, 2000);
    // Initial poll
    pollProgress();
    
    // Start the scraping process with proper headers
    fetch(`${API_BASE_URL}/api/generate-report`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success) {
            throw new Error(result.error || 'Failed to start scraping');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Error starting report generation: ' + error);
        eventSource.close();
        $('#generateBtn').prop('disabled', false);
    });
}

function checkForData() {
    // Get the latest data file from the data directory
    fetch(`${API_BASE_URL}/api/latest-data`)
        .then(response => response.json())
        .then(result => {
            if (result.success && result.data && result.data.properties) {
                initializeDataTable(result.data.properties);
                $('#lastUpdate').text(new Date().toLocaleString());
                $('#tableContainer').addClass('has-data');
                $('.dataTables_wrapper').show();
                $('#progressContainer').hide();
                $('#generateBtn').prop('disabled', false);
                showSuccess('Report generated successfully!');
            } else {
                throw new Error('No data available');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('Error loading data: ' + error);
            $('#generateBtn').prop('disabled', false);
        });
}

function initializeEmptyDataTable() {
    if (dataTable) {
        dataTable.destroy();
        $('#propertyTable').empty();
    }

    // Hide the table and controls initially
    $('.dataTables_wrapper').hide();
    
    dataTable = $('#propertyTable').DataTable({
        data: [],
        columns: [
            { 
                data: 'address', 
                title: 'Address'
            },
            { 
                data: 'price', 
                title: 'Price',
                render: function(data) {
                    return formatPrice(data);
                },
                type: 'price'
            },
            { 
                data: 'square_footage', 
                title: 'Square Footage',
                render: function(data) {
                    return data || 'N/A';
                },
                type: 'square-footage'
            },
            { 
                data: 'number_of_units', 
                title: 'Units Available',
                render: function(data) {
                    return data || 'N/A';
                },
                type: 'number'
            },
            {
                data: 'url',
                title: 'Listing URL',
                render: function(data) {
                    return data ? `<a href="${data}" target="_blank" rel="noopener noreferrer">View Listing</a>` : 'N/A';
                }
            },
            {
                data: 'contact_info',
                title: 'Contact Info',
                render: function(data) {
                    return data || 'N/A';
                }
            }
        ],
        dom: 'Bfrtip',
        buttons: ['copy', 'csv', 'excel', 'pdf', 'print']
    });
}

function showError(message) {
    $('#alertBox')
        .removeClass('alert-success')
        .addClass('alert-danger')
        .text(message)
        .show()
        .delay(5000)
        .fadeOut();
}

function showSuccess(message) {
    $('#alertBox')
        .removeClass('alert-danger')
        .addClass('alert-success')
        .text(message)
        .show()
        .delay(5000)
        .fadeOut();
}

$(document).ready(function() {
    // Add API key input if it doesn't exist
    if (!$('#apiKeyInput').length) {
        const apiKeyHtml = `
            <div class="form-group mb-3">
                <label for="apiKeyInput">Firecrawl API Key:</label>
                <input type="password" class="form-control" id="apiKeyInput" name="apiKey" required placeholder="Enter your API key">
                <small class="form-text text-muted">Get your API key at <a href="https://firecrawl.dev/pricing" target="_blank">firecrawl.dev</a></small>
            </div>
        `;
        $('#reportForm').prepend(apiKeyHtml);
    }

    // Initialize an empty DataTable but keep it hidden
    initializeEmptyDataTable();
    $('.dataTables_wrapper').hide();
    $('#lastUpdate').text('');
    
    // Set up event handlers
    $('#generateBtn').click(generateReport);
});
