export const questions = [
  {
    id: 1,
    question: 'How satisfied are you with PrettyBoy so far?',
    type: 'single',
    options: [
      'Very satisfied',
      'Satisfied',
      'Neutral',
      'Dissatisfied',
      'Very dissatisfied',
    ],
  },
  {
    id: 2,
    question: 'How likely are you to continue your subscription?',
    type: 'single',
    options: [
      'Very likely',
      'Likely',
      'Unsure',
      'Unlikely',
      'Very unlikely',
    ],
  },
  {
    id: 3,
    question: "What's the main reason you're not likely to continue?",
    type: 'single',
    conditional: {
      dependsOn: 2,
      showIf: ['Unsure', 'Unlikely', 'Very unlikely'],
    },
    options: [
      'Price feels too high',
      'Not seeing results yet',
      "I don't use it enough",
      'Prefer to buy when I need it',
    ],
  },
]