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
    id: 2,
    question: 'How does your current delivery frequency feel?',
    type: 'single',
    options: [
      'Just right',
      'Too frequent',
      'Not frequent enough',
      "I'm not sure yet",
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
    // Only shown if Q3 answer indicates dissatisfaction
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
    question: "What's the main reason you're unlikely to continue?",
    type: 'text',
    conditional: {
      dependsOn: 5,
      showIf: ['Unsure', 'Unlikely', 'Very unlikely'],
    },
  },
]
