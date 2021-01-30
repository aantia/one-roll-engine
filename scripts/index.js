/*
 * Parse and roll dice when users type `/ore 6d10` and similar syntax
 */
Hooks.on('chatMessage', (_, messageText, data) => {
  if (messageText !== undefined && messageText.startsWith(`/ore`)) {
    oreRollFromChatMessage(messageText, data)
    return false
  } else {
    return true
  }
})

/*
 * Toggle dashed outline of sets, when clicked
 */
Hooks.on('renderChatLog', () => {
  $('#chat-log').on('click', '.ore-set-roll', (event) => {
    event.preventDefault()
    const setsDiv = event.currentTarget
    setsDiv.style.outline = setsDiv.style.outline === 'dashed' ? 'none' : 'dashed'
  })
})

Hooks.on('init', () => {
  game.oneRollEngine = ORE
})

const oreRollFromChatMessage = async (messageText, data) => {
  const matches = messageText
    .match(new RegExp(`^/ore (.*?)(?:\\s*#\\s*([^]+)?)?$`))
  if (!matches) return errorParsing(messageText)
  const rollPart = matches[1], flavorText = matches[2]
  const diceCount = rollPart.match(new RegExp(`^([0-9]+)d?1?0?$`))[1]
  if (!diceCount) return errorParsing(messageText)
  const rolls = createRawRoll(diceCount)
  const rollResult = parseRawRoll(rolls, flavorText)
  data.content = await getContentFromRollResult(rollResult)
  return ChatMessage.create(data, {})
}

const errorParsing = (messageText) => {
  ui.notifications.error(`Failed parsing ORE command: \n${messageText}`)
  return null
}

/**
 * returns an array, e.g. [2, 10, 5, 6, 5, 5, 3, 1, 1, 8]
 */
const createRawRoll = (diceCount) => {
  return new Roll(`${diceCount}d10`).roll().terms[0].results.map(r => r.result)
}

/**
 * @typedef ORESet
 * @type {object}
 * @property {number} width - e.g. 3
 * @property {height} width - e.g. 2
 * @property {number[]} rollsInSet - e.g. [2, 2, 2]
 */

/**
 * @typedef ORERollResult
 * @type {object}
 * @property {number[]} rawRolls - e.g. [1, 2, 4, 2, 10, 2, 1]
 * @property {string} flavorText - e.g. "Flaming sword attack"
 * @property {ORESet[]} sets - e.g. [{width: 3, height: 2, rollsInSet: [2, 2, 2]}, {width: 2, height: 1, rollsInSet: [1, 1]}]
 * @property {number[]} looseDice - e.g. [4, 10]
 */

/**
 * @param {number[]} rawRolls - e.g. [1, 2, 4, 2, 10, 2, 1]
 * @param {string} flavorText - e.g. "Flaming sword attack"
 * @returns {ORERollResult}
 */
const parseRawRoll = (rawRolls, flavorText) => {
  const counts = new Array(11).fill(0)  // [0, 1, ..., 9, 10].  the 0 is not used
  for (const k of rawRolls) {
    counts[k] += 1
  }
  const sets = {}
  const looseDice = []
  counts.forEach((count, num) => {
    if (count === 0) return  // (will also skip the "0" count)
    if (count === 1) looseDice.push(num)
    if (count >= 2) sets[num] = count
  })
  return {
    rawRolls,
    flavorText,
    sets: Object.entries(sets)
      .map(s => [parseInt(s[0], 10), s[1]])
      .sort((s1, s2) => s1[0] - s2[0])
      .map(s => ({
        width: s[1],
        height: s[0],
        rollsInSet: new Array(s[1]).fill(s[0]),
      })),
    looseDice,
  }
}

/**
 * @param {ORERollResult} rollResult
 */
const getContentFromRollResult = async (rollResult) => {
  const {sets, looseDice, flavorText} = rollResult
  return await renderTemplate(`modules/one-roll-engine/templates/ore-roll.html`, {
    sets, looseDice, flavorText,
  })
}

const ORE = {
  createRawRoll,
  parseRawRoll,
  getContentFromRollResult,
}