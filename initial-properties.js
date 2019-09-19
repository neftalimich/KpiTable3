define([], function () {
    'use strict';
    return {
        qHyperCubeDef: {
            qDimensions: [],
            qMeasures: [],
            qInitialDataFetch: [{
                qWidth: 20,
                qHeight: 50
            }]
        },
        cube2: {
            qHyperCubeDef: {
                qDimensions: [],
                qMeasures: [],
                qInitialDataFetch: [
                    {
                        qWidth: 5,
                        qHeight: 2000
                    }
                ],
                qSuppressZero: false,
                qSuppressMissing: false,
                qMode: "S",
                qColumnOrder: [],
                qInterColumnSortOrder: [],
                qStateName: "$"
            }
        }
    };
});