const MAX_LEVEL = 16;

const LEVEL_PROBABILITY = 0.5;

const generateRandomLevel = () => {

    let level = 0;

    while (

        Math.random() < LEVEL_PROBABILITY &&

        level < MAX_LEVEL

    ) {

        level++;

    }

    return level;

};

module.exports = {

    MAX_LEVEL,

    LEVEL_PROBABILITY,

    generateRandomLevel

};