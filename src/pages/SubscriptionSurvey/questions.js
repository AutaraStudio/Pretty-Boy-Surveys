export const questions = [
  {
    id: 1,
    question: 'How satisfied are you with your Laundry Sauce subscription so far?',
    type: 'single',
    options: [
      'Very satisfied',
      'Somewhat satisfied',
      'Neutral',
      'Somewhat dissatisfied',
      'Very dissatisfied',
    ],
  },
  {
    id: 3,
    question: 'How happy are you with your current scent?',
    type: 'single',
    options: [
      'Love it',
      'Like it',
      "It's okay",
      'Not for me',
      'Strongly dislike',
    ],
  },
  {
    id: 4,
    question: "What about the scent isn't quite right for you?",
    subtitle: 'Select all that apply',
    type: 'multi',
    conditional: {
      dependsOn: 3,
      showIf: ["It's okay", 'Not for me', 'Strongly dislike'],
    },
    options: [
      'Too strong',
      'Too subtle',
      "Doesn't last as long as I hoped",
      'Different than expected',
    ],
  },
  {
    id: 5,
    question: 'How likely are you to continue with your subscription?',
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
    id: 6,
    question: "What's the main reason you're unlikely to continue your subscription?",
    type: 'single',
    // Only shown if Q5 is Unlikely or Very unlikely (not Unsure)
    conditional: {
      dependsOn: 5,
      showIf: ['Unlikely', 'Very unlikely'],
    },
    options: [
      'Price feels too high',
      'Not using it enough',
      "The scent isn't right",
      'Prefer to buy when I need it',
    ],
  },
]
