define([
    "qlik",
    "jquery",
    "./initial-properties",
    "./properties",
    "text!./style.css",
    "text!./template.html",
    "./js/highcharts_6.1.1"
], function (qlik, $, initProps, props, cssContent, template, highcharts) {
    'use strict';

    var app = qlik.currApp();
    $("<style>").html(cssContent).appendTo("head");
    $('<link rel="stylesheet" type="text/css" href="/extensions/KpiTable3/css/fontawesome-all.css">').html("").appendTo("head");
    //$('<script src="/extensions/KpiTable3/js/highcharts_6.1.1.js">').html("").appendTo("head");
    //$('<script src="/extensions/KpiTable3/js/highcharts-more_6.1.1.js">').html("").appendTo("head");

    return {
        template: template,
        initialProperties: initProps,
        definition: props,
        support: {
            snapshot: function (layout) {
                return layout.props.snapshotEnabled;
            },
            export: true,
            exportData: true
        },
        paint: function () {
            //setup scope.table
            if (!this.$scope.table) {
                this.$scope.table = qlik.table(this);
                //console.log("KpiTable3 - Table", this.$scope.table);
            }
            moveScroll();
            return qlik.Promise.resolve();
        },
        controller: ['$scope', function ($scope) {
            //console.log("KpiTable3 - layout", $scope.layout);
            $scope.kpiTableId = $scope.layout.qInfo.qId;
            $scope.dimLength = 0;
            $scope.meaLength = 0;

            // ------------------------------- Watchers
            $scope.$watchCollection("layout.qHyperCube.qDataPages", function (newValue) {
                $scope.SetTableIndex();
                angular.element(document).ready(function () {
                    $scope.GroupData();
                    $scope.SetColumnOrder();
                });
            });

            $scope.$watchCollection("layout.qHyperCube.qDimensionInfo", function (newValue) {
                $scope.dimLength = $scope.layout.qHyperCube.qDimensionInfo.length;
            });
            $scope.$watchCollection("layout.qHyperCube.qMeasureInfo", function (newValue) {
                $scope.meaLength = $scope.layout.qHyperCube.qMeasureInfo.length;
            });
            $scope.$watchCollection("layout.props.columnOrder", function (newValue) {
                angular.element(document).ready(function () {
                    $scope.SetColumnOrder();
                });
            });
            // -------------------------------

            // ------------------------------- TableIndex
            $scope.tableIndex = [];
            $scope.SetTableIndex = function () {
                $scope.tableIndex = [];
                angular.forEach($scope.layout.qHyperCube.qDataPages, function (qDataPage, key) {
                    let pageKey = key;
                    angular.forEach(qDataPage.qMatrix, function (row, key) {
                        $scope.tableIndex.push({
                            page: pageKey,
                            index: key
                        });
                    });
                });
                //console.log("tableIndex", $scope.tableIndex);
            };
            // ------------------------------- More Data
            $scope.loading = false;
            $scope.GetMoreData = function (table) {
                if (table.rowCount > table.rows.length) {
                    $scope.loading = true;
                    table.getMoreData()
                        .then(val => {
                        })
                        .catch(err => {
                            // console.error("Tabla");
                            $scope.table = null;
                        })
                        .finally(f => {
                            $scope.loading = false;
                            $scope.GroupData();
                        });
                }
                //console.log("table",table);
                return true;
            };
            // -------------------------------

            // ------------------------------- Group Data
            $scope.cubeGrouped = [];
            $scope.GroupData = function () {
                $scope.loading = true;
                $scope.cubeGrouped = [];
                let qMatrixCopy = [];

                $scope.layout.qHyperCube.qDataPages.forEach(qDataPage => {
                    qMatrixCopy.push.apply(qMatrixCopy, JSON.parse(JSON.stringify(qDataPage.qMatrix)));
                });

                // -------------------------------
                let level1 = qMatrixCopy.reduce((accumulator, currentValue, index) => {
                    let keyAux = currentValue[1].qText;
                    accumulator[keyAux] = accumulator[keyAux] || [];
                    accumulator[keyAux].push({ index: index, item: currentValue });
                    return accumulator;
                }, {});

                $scope.cubeGrouped = Object.keys(level1).map(key => {
                    return { name: key, countItems: level1[key].length, dataL1: level1[key] };
                });

                // Level1
                angular.forEach($scope.cubeGrouped, function (level1, key) {
                    let level2Aux = level1.dataL1.reduce((accumulator, currentValue) => {
                        let keyAux = currentValue.item[2].qText;
                        accumulator[keyAux] = accumulator[keyAux] || [];
                        accumulator[keyAux].push({ index: currentValue.index, item: currentValue.item });
                        return accumulator;
                    }, {});

                    level1.dataL1 = Object.keys(level2Aux).map(key => {
                        return { name: key, description: '', dataL2: level2Aux[key] };
                    });

                    //console.log("level1", level1);

                    //Level2
                    angular.forEach(level1.dataL1, function (level2, key) {
                        let level3Aux = level2.dataL2.reduce((accumulator, currentValue) => {
                            let keyAux = currentValue.item[3].qText;
                            accumulator[keyAux] = accumulator[keyAux] || [];
                            accumulator[keyAux].push({ index: currentValue.index, item: currentValue.item });
                            return accumulator;
                        }, {});

                        level2.dataL2 = Object.keys(level3Aux).map(function (key) {
                            return { name: key, description: '', dataL3: level3Aux[key] };
                        });

                        if (!level1.countItems2) {
                            level1.countItems2 = 0;
                        }
                        level1.countItems2 += level2.dataL2.length;
                        //console.log("level2", level2);

                        //Level3
                        angular.forEach(level2.dataL2, function (level3, key) {
                            let level4Aux = level3.dataL3.reduce((accumulator, currentValue) =>{
                                let keyAux = currentValue.item[4].qText;
                                accumulator[keyAux] = accumulator[keyAux] || [];
                                accumulator[keyAux].push({ index: currentValue.index, item: currentValue.item, newCount: 0 });
                                return accumulator;
                            }, {});

                            level3.dataL3 = Object.keys(level4Aux).map(key => {
                                return { name: key, description: '', dataL4: level4Aux[key], newCount: 0 };
                            });

                            if (!level2.countItems) {
                                level2.countItems = 0;
                            }
                            level2.countItems += level3.dataL3.length;
                            level3.countItems = level3.dataL3.length;
                        });
                    });
                });
                
                // -------------------------------

                // ------------------------------- Contadores de secuencia Auxiliares
                let countAux2 = 0;
                let countAux3 = 0;
                let countAux4 = 0;

                angular.forEach($scope.cubeGrouped, function (level1, index1) {
                    level1.countParents = 0;
                    angular.forEach(level1.dataL1, function (level2, index2) {
                        level2.count = countAux2;
                        level2.countParents = 0;
                        countAux2 += 1;
                        let keeptGoing2 = true;
                        angular.forEach(level2.dataL2, function (level3, index3) {
                            level3.count = countAux3;
                            level3.countParents = 0;
                            countAux3 += 1;
                            let keeptGoing3 = true;
                            angular.forEach(level3.dataL3, function (level4, index4) {
                                level4.count = countAux4;
                                countAux4 += 1;
                                angular.forEach(level4.dataL4, function (level5, index5) {
                                    if (keeptGoing2 && level5.item[2].qAttrExps.qValues[1].qNum === 1) {
                                        //console.log("x", level5);
                                        level2.parentL2 = level5.item[3];
                                        level2.parentIndex2 = level5.index;
                                        level1.countParents += 1;

                                        keeptGoing2 = false;
                                    }
                                    if (keeptGoing3 && level5.item[3].qAttrExps.qValues[1].qNum === 1) {
                                        //console.log("y", level5, level2.parentL2);
                                        level3.parentL3 = level5.item[4];
                                        level3.parentIndex3 = level5.index;
                                        level2.countParents += 1;

                                        level3.dataL3.splice(index4, 1);

                                        keeptGoing3 = false;
                                    }
                                });
                            });
                        });
                    });
                });

                let newCount = 1;
                angular.forEach($scope.cubeGrouped, function (level1, index1) {
                    angular.forEach(level1.dataL1, function (level2, index2) {
                        angular.forEach(level2.dataL2, function (level3, index3) {
                            level3.newCount = newCount;
                            newCount += 1;
                            angular.forEach(level3.dataL3, function (level4, index4) {
                                level4.newCount = newCount;
                                newCount += 1;
                            });
                        });
                    });
                });

                $scope.loading = false;
                console.log("cubeGrouped", $scope.cubeGrouped);
                // -------------------------------
            };

            // ------------------------------- Collapse 
            $scope.CollapseChilds = function (level, levelUp) {
                level.childsHidden = !level.childsHidden;
                let hasParent = level.parentL3 ? 1 : 0;
                if (levelUp) {
                    if (level.childsHidden) {
                        levelUp.countItems -= level.countItems - hasParent;
                    } else {
                        levelUp.countItems += level.countItems - hasParent;
                    }
                }
            };
            // ------------------------------- 

            // ------------------------------- ColumnOrder
            $scope.columnOrder = [];
            $scope.SetColumnOrder = function () {
                let dimLength = $scope.layout.qHyperCube.qDimensionInfo.length;
                let meaLength = $scope.layout.qHyperCube.qMeasureInfo.length;
                $scope.columnOrder = [];
                if ($scope.layout.props.columnOrder) {
                    try {
                        let splitString = $scope.layout.props.columnOrder.split(',');
                        for (let i = 0; i < splitString.length; i++) {
                            if (!isNaN(splitString[i])) {
                                if (parseInt(splitString[i]) < dimLength + meaLength) {
                                    $scope.columnOrder.push(parseInt(splitString[i]));
                                }
                            }
                        }
                        if (splitString.length !== dimLength + meaLength) {
                            for (let i = 0; i < dimLength + meaLength; i++) {
                                let exist = false;
                                for (let j = 0; j < splitString.length; j++) {
                                    if (parseInt(splitString[j]) === i) {
                                        exist = true;
                                        break;
                                    }
                                }
                                if (!exist) {
                                    $scope.columnOrder.push(i);
                                }
                            }
                        }
                    } catch (err) {
                        //console.log(err);
                    }
                } else {
                    for (let i = 0; i < dimLength + meaLength; i++) {
                        $scope.columnOrder.push(i);
                    }
                }
            };
            // -------------------------------
            // ------------------------------- Hide Columns
            $scope.CheckHide = function (col) {
                if ($scope.table && $scope.table.headers[col].qMeasureInfo) {
                    let colspan = 0;
                    colspan = $scope.table.headers[col].qMeasureInfo.pColspanTitle;
                    if (colspan > 1) {
                        let hide = 0;
                        let count = 0;
                        for (let i = 0; i < colspan; i++) {
                            if ($scope.table.headers[col + i].qMeasureInfo.pHideColumn === 1) {
                                count += 1;
                            }
                        }
                        if ($scope.table.headers[col].qMeasureInfo.pHideColumn === 1) {
                            hide = 1;
                        }
                        return [hide, count];
                    } else {
                        if ($scope.table.headers[col].qMeasureInfo.pHideColumn === 1) {
                            return [1, 1];
                        } else {
                            return [0, 0];
                        }
                    }
                } else {
                    return [0, 0];
                }
            };
            // -------------------------------
            $scope.CountHideMeasures = function () {
                let result = 0;
                angular.forEach($scope.layout.qHyperCube.qMeasureInfo, function (measure, key) {
                    if (measure.pHideColumn) {
                        result += 1;
                    }
                });
                return result;
            };
            $scope.FormatTicker = function (ticker) {
                if (ticker) {
                    return ticker.replace(/\d+$/, '');
                } else {
                    return '';
                }
            };
            // -------------------------------

            // ------------------------------- Extra
            $scope.GoUrl = function (id) {
                //if (id.length > 0) {
                //    app.field($scope.layout.props.chartfield).selectMatch(id, !1);
                //    qlik.navigation.gotoSheet($scope.layout.props.selectedSheet);
                //}
            };
            $scope.GoUrlMashup = function (id) {
                window.location = "CoppelMashup.html#?menu=5&submenu=1&f.KPI_ID=" + id;
            };
            // ------------------------------- iFrame
            $scope.sFrame = false;
            $scope.origin = document.location.origin;
            $scope.protocol = document.location.protocol;
            $scope.ShowFrame = function (id) {
                $scope.sFrame = true;

                //$scope.idk = $scope.origin + $scope.layout.props.urlIframe + id;

                app.field("KPI_ID").selectMatch(id, !1);

                app.visualization.get('DmEgZQe').then(function (vis) {
                    vis.show("QV01" + $scope.kpiTableId);
                });
                app.visualization.get('aEyjJ').then(function (vis) {
                    vis.show("QV02" + $scope.kpiTableId);
                });
                app.visualization.get('Mjkjwcr').then(function (vis) {
                    vis.show("QV04" + $scope.kpiTableId);
                });
                app.visualization.get('SjjZWsE').then(function (vis) {
                    vis.show("QV05" + $scope.kpiTableId);
                });
                app.visualization.get('adaAmT').then(function (vis) {
                    vis.show("QV06" + $scope.kpiTableId);
                });
                app.visualization.get('USYtzd').then(function (vis) {
                    vis.show("QV07" + $scope.kpiTableId);
                });
                app.visualization.get('EbZfLZT').then(function (vis) {
                    vis.show("QV08" + $scope.kpiTableId);
                });
                app.visualization.get('JTMxZMZ').then(function (vis) {
                    vis.show("QV11" + $scope.kpiTableId);
                });
                app.visualization.get('hKzwRPz').then(function (vis) {
                    vis.show("QV12" + $scope.kpiTableId);
                });
                app.visualization.get('wzqLmCR').then(function (vis) {
                    vis.show("QV13" + $scope.kpiTableId);
                });
                app.visualization.get('Pppvm').then(function (vis) {
                    vis.show("QV14" + $scope.kpiTableId);
                });
                app.visualization.get('CGzSJqk').then(function (vis) {
                    vis.show("QV15" + $scope.kpiTableId);
                });
                app.visualization.get('uEEjd').then(function (vis) {
                    vis.show("QV16" + $scope.kpiTableId);
                });
                app.visualization.get('JbEZRf').then(function (vis) {
                    vis.show("QV17" + $scope.kpiTableId);
                });
                app.visualization.get('pzFnee').then(function (vis) {
                    vis.show("QV19" + $scope.kpiTableId);
                });
                app.visualization.get('rkQusU').then(function (vis) {
                    vis.show("QV20" + $scope.kpiTableId);
                });
            };
            // -------------------------------

            // ------------------------------- Header Fix
            angular.element(document).ready(function () {
                $('#container-' + $scope.layout.qInfo.qId).scroll(moveScroll);
            });
            // -------------------------------
            var clone_table = null;
            function moveScroll() {
                let containerId = '#container-' + $scope.layout.qInfo.qId;
                let tableContainerId = '#table-container-' + $scope.layout.qInfo.qId;
                let tableId = '#table-' + $scope.layout.qInfo.qId;
                let cloneId = 'clone-' + $scope.layout.qInfo.qId;

                clone_table = $('#' + cloneId);
                let containerTop = $(containerId).offset().top;
                let scroll = $(containerId).scrollTop();
                let anchor_top = $(tableId).offset().top;

                if ($(tableId).width() !== clone_table.width()) {
                    $('#' + cloneId).remove();
                }

                if (scroll + containerTop > anchor_top) {
                    clone_table = $('#' + cloneId);
                    if (clone_table.length === 0) {
                        clone_table = $(tableId).clone();
                        clone_table.attr('id', cloneId);
                        clone_table.css({
                            position: 'fixed',
                            'pointer-events': 'none',
                            top: containerTop
                        });
                        clone_table.width($(tableId).width());
                        $(tableContainerId).append(clone_table);
                        clone_table.css({ visibility: 'hidden' });
                        clone_table.find('thead').css({ visibility: 'visible' });
                    }
                } else {
                    $('#' + cloneId).remove();
                }
            }
            // -------------------------------
        }]
    };
});