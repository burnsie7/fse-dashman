$(document).ready(function() {

    function Dashboard(id, title, type, description, width) {
        this.id = id;
        this.title = title;
        this.type = type;
        this.description = description;
        this.width = width;
    }

    function objStore() {
        this.store = {};

        this.addObj = function(obj) {
            if (obj.id) {
                this.store[obj.id] = obj;
            }
        }

        this.updateObj = function(id, key, value) {
            if (id && this.store[id]) {
                this.store[id][key] = value;
            }
        }

        this.removeObjByDashId = function(dashId) {
            for (var obj in this.store) {
                if (this.store.hasOwnProperty(obj)) {
                    if (this.store[obj]['dashId'] == dashId) {
                        delete this.store[obj];
                    }
                }
            }
        }

        this.returnArray = function() {
            var retArr = [];
            for (obj in this.store) {
                retArr.push(this.store[obj]);
            }
            return retArr;
        }
    }

    var dashDesc = '', dashType = null, dashTitle = '', destType = '', dashWidth = 1024, sourceCount = 1;
    var allVars = new objStore(), allCharts = new objStore(), dashboards = {};

    function loadDashboard(dashboard, dashId) {

        var currentVars = allVars.returnArray();

        if (Object.keys(dashboards).length) {
            if (dashType && dashboard.type != dashType) {
                alert('Can only combine dashboards of the same type.');
                return;
            }
            // TODO: get rid of dashWidth - calculate in python
            if (dashboard.width > dashWidth) {
                dashWidth = dashboard.width;
            }
        } else {
            $.when(resetPage()).done(function() {
                dashTitle = dashboard.title;
                dashDesc = dashboard.description;
                destType = dashboard.type;
                dashType = dashboard.type.toLowerCase();
                dashWidth = dashboard.width;
                $("#dashTitle").val(dashTitle);
                $("#dashDescription").val(dashDesc);
            });
        }

        for (var i=0; i < dashboard.charts.length; i++) {
            var tempChart = dashboard.charts[i];
            tempChart['selected'] = true;
            tempChart['dashId'] = dashId;
            tempChart['id'] = dashId + '-' + i;
            allCharts.addObj(tempChart);
        }

        for (var i=0; i < dashboard.template_variables.length; i++) {
            var addVar = true;
            tV = dashboard.template_variables[i];
            for (var j=0; j < currentVars.length; j++) {
                var cV = currentVars[j];
                if (tV.name == cV.name && tV.prefix == cV.prefix && tV.default == cV.default) {
                    addVar = false;
                }
            }
            if (addVar) {
                tV['selected'] = true;
                tV['dashId'] = dashId;
                tV['id'] = dashId + '-' + i;
                allVars.addObj(tV);
            }
        }

        dashboards[dashId] = new Dashboard(dashId, dashboard.title, dashboard.description, dashboard.type, dashboard.width)

        renderCharts();
        renderVars();
        $("#typeDropdownButton:first-child").text(destType);
        $("#typeDropdownButton:first-child").val(destType);
        $('#typeDropdownButton').prop('disabled', false);
        $('#add-source').css('display', 'flex');
    }

    function deleteDashboard(dashId) {
        for (var obj in dashboards) {
            if (dashboards.hasOwnProperty(obj)) {
                if (dashboards[obj]['id'] == dashId) {
                    delete dashboards[obj];
                }
            }
        }
        $.when(allCharts.removeObjByDashId(dashId)).done(function() {
            renderCharts();
        });
        $.when(allVars.removeObjByDashId(dashId)).done(function() {
            renderVars();
        });
        if (!Object.keys(dashboards).length) {
            resetPage();
        }
    }

    function renderChart(chart) {
        var chartsEl = $("#charts");
        if (dashType == 'screenboard') {
            var wTitle = chart.title_text;
            var wType = chart.type;
            if (wType == 'image') {
                wTitle = chart.url;
            } else if (wType == 'note') {
                wTitle = chart.html;
            }
        } else if (dashType == 'timeboard') {
            var wTitle = chart.title;
            var wType = chart.definition.viz;
        }
        // TODO: Use a table
        chartsEl.append($.parseHTML(
            `<div>
                <input type="checkbox"
                       class="chart-checkbox"
                       value="` + chart.id + `" checked>
                <b>Title:</b> ` + wTitle + ` <b>Type:</b> ` + wType + ` <b>Dash:</b> ` + chart.dashId + `
                </input>
            </div>`
        ));
    }

    function renderCharts() {
        $("#charts").empty();
        var tempCharts = allCharts.returnArray();
        for (var i=0; i < tempCharts.length; i++) {
            renderChart(tempCharts[i]);
        }
    }

    function renderVars() {
        $("#template-vars").empty();
        var tempVars = allVars.returnArray();
        for (var i=0; i < tempVars.length; i++) {
            renderDashVar(tempVars[i]);
        }
    }

    function renderDashVar(dashVar) {
        $("#template-vars").append($.parseHTML(
            `<div>
                <input type="checkbox"
                       class="vars-checkbox"
                       value="` + dashVar.id + `" checked>
                <b>Prefix:</b> ` + dashVar.prefix + ` <b>Name:</b> ` + dashVar.name + ` <b>Default:</b> ` + dashVar.default + `
                </input>
            </div>`
        ));
    }

    function resetPage() {
        $("#results").empty();
        $('#add-source').css('display', 'none');
        dashDesc = '', dashType = null, dashTitle = '', destType = '', dashWidth = 1024, dashId = 0;
        allVars = new objStore(), allCharts = new objStore(), dashboards = {};
    }

    function addSource() {
        var dashId = 's' + sourceCount;
        sourceCount += 1;
        var sourceMain = $('.source-container').children('.source-main').first();
        var newSource = sourceMain.clone(true, false).appendTo( ".source-container").attr("id", dashId);
        newSource.find('.source-label').html("Source Dashboard - (" + dashId + ")").css("font-weight","Bold");
    }

    $("#template-vars").on("change", ".vars-checkbox", (function() {
        var t_id = this.value;
        if (this.checked === true) {
            allVars.updateObj(t_id, 'selected', true);
        } else if (this.checked === false) {
            allVars.updateObj(t_id, 'selected', false);
        }
    }));

    $("#charts").on("change", ".chart-checkbox", (function() {
        var w_id = this.value;
        if (this.checked === true) {
            allCharts.updateObj(w_id, 'selected', true);
        } else if (this.checked === false) {
            allCharts.updateObj(w_id, 'selected', false);
        }
    }));

    $(".source-container").on("click", ".source-select ul li a", function() {
        var sourceSelect = $(this).text()
        $(this).closest('.dropdown-menu').siblings("button").text(sourceSelect);
        $(this).closest('.dropdown-menu').siblings("button").val(sourceSelect);
        var sourceOrgForm = $(this).closest('.source-main').children('.source-form-top').children('.source-org-form');
        var sourceFileForm = $(this).closest('.source-main').children('.source-form-top').children('.source-file-form');
        if (sourceSelect == "File") {
            sourceOrgForm.css('display', 'none')
            sourceFileForm.css('display', 'flex')
        } else if (sourceSelect == "Organization") {
            sourceOrgForm.css('display', 'flex')
            sourceFileForm.css('display', 'none')
        }
    });

    $(".source-container").on("submit", ".source-org-form", function() {
        var apiKey = $(this).find('input[name="sourceAPIKey"]').val();
        var appKey = $(this).find('input[name="sourceAPPKey"]').val();
        var boardId = $(this).find('input[name="sourceDashId"]').val();

        if (!apiKey || !appKey || !boardId) {
            alert('apiKey, appKey, and dashId are required');
        } else {
            var dashId = $(this).closest('.source-main').attr("id");
            $.when(deleteDashboard(dashId)).done(function() {
                $.ajax({
                    type: "POST",
                    url: "/get_dash",
                    data: {apiKey: apiKey, appKey: appKey, dashId: boardId},
                    success: function(results) {
                        if (results) {
                            loadDashboard(results, dashId);
                        } else {
                            $("#charts").html("No Charts");
                            $("#template-vars").html("No Template Variables");
                        }
                    },
                    error: function(error) {
                        alert("error = ", error);
                    }
                });
            });
        }
    });

    $(".source-container").on("submit", ".source-file-form", function(e) {
        e.preventDefault();
        var formData = new FormData($(this)[0]);
        // TODO: validate
        var dashId = $(this).closest('.source-main').attr("id");
        $.when(deleteDashboard(dashId)).done(function() {
            $.ajax({
                url: "/load_file",
                type: 'POST',
                data: formData,
                async: false,
                success: function (results) {
                    if (results) {
                        loadDashboard(results, dashId);
                    } else {
                        $("#charts").html("No Charts");
                        $("#template-vars").html("No Template Variables");
                    }
                },
                error: function(error) {
                    console.log("error = ", error);
                },
                cache: false,
                contentType: false,
                processData: false
            });
        });
    });

    $("button#add-source").click(function() {
        addSource();
    });

    $(".source-container").on("click", ".source-remove", function() {
        var sourceMain = $(this).closest('.source-main');
        var dashId = sourceMain.attr("id");
        $.when(deleteDashboard(dashId)).done(function() {
            if (Object.keys(dashboards).length) {
                sourceMain.remove();
            }
            else {
                addSource();
                sourceMain.remove();
                resetPage();
            }
        });
    });

    $("#titleEditForm").on("input", function() {
        dashTitle = $('input[name="dashTitleInput"]').val();
    });

    $("#descEditForm").on("input", function() {
        dashDesc = $('input[name="dashDescInput"]').val();
    });

    $("#type-select li a").on("click", function() {
        var typeSelect = $(this).text()
        $("#typeDropdownButton:first-child").text(typeSelect);
        $("#typeDropdownButton:first-child").val(typeSelect);
        destType = typeSelect;
    });

    $("#dest-select li a").on("click", function() {
        var destSelect = $(this).text()
        $("#destDropdownButton:first-child").text(destSelect);
        $("#destDropdownButton:first-child").val(destSelect);
        if (destSelect == "JSON") {
            $("#destOrgForm").css('display', 'none')
            $("#destFileSubmit").css('display', 'flex')
        } else if (destSelect == "Organization") {
            $("#destOrgForm").css('display', 'flex')
            $("#destFileSubmit").css('display', 'none')
        }
    });

    $("#destOrgForm").on("submit", function() {
        $("#results").empty();
        var destApiKey = $('input[name="destAPIKey"]').val();
        var destAppKey = $('input[name="destAPPKey"]').val();
        var tempCharts = allCharts.returnArray();

        if (!destApiKey || !destAppKey) {
            alert('apiKey and appKey are required');
        } else if (!dashType || !tempCharts.length) {
            alert('Source dashboard not loaded properly')
        } else {
            $.ajax({
                type: "POST",
                url: "/send_dash",
                data: {'api_key': destApiKey, 'app_key': destAppKey, 'dest_type': destType, 'type': dashType, 'title': dashTitle, 'description': dashDesc,
                       'width': dashWidth, 'template_variables': JSON.stringify(allVars.returnArray()), 'charts': JSON.stringify(tempCharts)},
                    success: function(results) {
                        var url;
                        if (results.board_title) {
                            url = 'https://app.datadoghq.com/screen/' + results.id;
                        } else {
                            url = 'https://app.datadoghq.com/dash/' + results.dash.id;
                        }
                        $("#results").html("Dashboard created successfully <a href=" + url + ">here.</a>");
                    },
                    error: function(error) {
                        console.log("error = ", error);
                    }
                });
        }
    });

    $("#destFileSubmit").on("click", function() {
        $("#results").empty();
        $.ajax({
            type: "POST",
            url: "/save_dash",
            data: {'dest_type': destType, 'type': dashType, 'title': dashTitle, 'description': dashDesc,
                   'width': dashWidth, 'template_variables': JSON.stringify(allVars.returnArray()), 'charts': JSON.stringify(allCharts.returnArray())},
            success: function(results) {
                $("#results").html("Download your file here: <a href=" + results + ">" + results + "</a>");
            },
            error: function(error) {
                console.log("error = ", error);
            }
        });

    });
});