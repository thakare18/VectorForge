const Vector = require("../models/Vector");

const sampleData = [
    new Vector(
        "1",
        [
            0.92, 0.81, 0.75, 0.68,
            0.34, 0.22, 0.19, 0.16,
            0.14, 0.12, 0.10, 0.08,
            0.07, 0.06, 0.05, 0.04
        ],
        {
            title: "Binary Tree",
            category: "Computer Science"
        }
    ),

    new Vector(
        "2",
        [
            0.89, 0.79, 0.73, 0.64,
            0.30, 0.21, 0.18, 0.15,
            0.13, 0.11, 0.09, 0.07,
            0.06, 0.05, 0.04, 0.03
        ],
        {
            title: "Graph",
            category: "Computer Science"
        }
    ),

    new Vector(
        "3",
        [
            0.10, 0.14, 0.18, 0.22,
            0.81, 0.86, 0.90, 0.93,
            0.41, 0.38, 0.36, 0.32,
            0.28, 0.24, 0.20, 0.16
        ],
        {
            title: "Pizza",
            category: "Food"
        }
    ),

    new Vector(
        "4",
        [
            0.12, 0.15, 0.19, 0.23,
            0.83, 0.88, 0.91, 0.94,
            0.42, 0.39, 0.35, 0.31,
            0.27, 0.22, 0.18, 0.15
        ],
        {
            title: "Burger",
            category: "Food"
        }
    )
];

module.exports = sampleData;