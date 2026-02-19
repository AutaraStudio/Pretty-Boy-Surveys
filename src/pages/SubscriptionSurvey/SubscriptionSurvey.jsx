import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { questions } from './questions'
import Logo from '../../components/Logo'
import './SubscriptionSurvey.css'

gsap.registerPlugin(CustomEase)

CustomEase.create('smooth', '0.22, 1, 0.36, 1')
CustomEase.create('buttery', '0.16, 1, 0.3, 1')

const STAGGER_IN = 0.07
const STAGGER_OUT = 0.04
const DURATION_IN = 0.55
const DURATION_OUT = 0.28

const STATIC_IMAGE = '/images/subscription/survey-image.webp'

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbyhliXUiqU8dGP21BpcTWKBwfMvzFYZqWCcdmWYWTGlJu9fQ5VF6zEliEiDqp21Xieg/exec'

const THANK_YOU = {
  image: '/images/subscription/thank-you-page.webp',
  heading: 'Thank you for<br>your feedback!',
  body: 'Your responses help us make Laundry Sauce even better.',
  linkText: 'Scent Quiz',
  linkUrl: 'https://laundrysauce.com/pages/quiz#step=1',
}

// ─── Unique session ID generated once per page visit ───
// A new ID is created every time the page loads, so revisits = new sheet row
const SESSION_ID = Math.random().toString(36).substring(2) + Date.now().toString(36)

// Collect all .anim-item elements inside a container
function getAnimItems(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll('.anim-item'))
}

// Parse URL params to pre-fill answers from email links
// URL format: ?email=user@example.com&question=1&answer=2
function getEmailPrefill() {
  try {
    const params = new URLSearchParams(window.location.search)

    // Capture email
    const email = params.get('email') || ''

    const qParam = params.get('question') || params.get('q')
    const aParam = params.get('answer') ?? params.get('a')

    if (!qParam || aParam === null) {
      return { email, answers: {}, startStep: 0 }
    }

    const qIndex = parseInt(qParam, 10) - 1
    if (isNaN(qIndex) || qIndex < 0 || qIndex >= questions.length) {
      return { email, answers: {}, startStep: 0 }
    }

    const question = questions[qIndex]
    if (!question.options) {
      return { email, answers: {}, startStep: 0 }
    }

    const aIndex = parseInt(aParam, 10) - 1
    if (isNaN(aIndex) || aIndex < 0 || aIndex >= question.options.length) {
      return { email, answers: {}, startStep: 0 }
    }
    const answerValue = question.options[aIndex]

    let startStep = qIndex + 1
    if (startStep >= questions.length) startStep = questions.length - 1

    return {
      email,
      answers: { [question.id]: answerValue },
      startStep,
    }
  } catch {
    return { email: '', answers: {}, startStep: 0 }
  }
}

const emailPrefill = getEmailPrefill()

function SubscriptionSurvey() {
  const [currentStep, setCurrentStep] = useState(emailPrefill?.startStep ?? 0)
  const [answers, setAnswers] = useState(emailPrefill?.answers ?? {})
  const [error, setError] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)

  const formAreaRef = useRef(null)
  const submitWrapRef = useRef(null)
  const thankYouRef = useRef(null)
  const surveyContainerRef = useRef(null)
  const autoAdvanceTimer = useRef(null)

  const answersRef = useRef(emailPrefill?.answers ?? {})
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  // ─── Update URL params to reflect current answers ───
  const updateUrlParams = useCallback((updatedAnswers) => {
    if (!emailPrefill?.email) return

    const params = new URLSearchParams()
    params.set('email', emailPrefill.email)

    Object.entries(updatedAnswers).forEach(([qId, value]) => {
      if (Array.isArray(value)) {
        params.set(`q${qId}`, value.join(','))
      } else if (value !== undefined && value !== '') {
        params.set(`q${qId}`, value)
      }
    })

    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
  }, [])

  // ─── Submit to Google Sheet ───
  const submitToSheet = useCallback((finalAnswers) => {
    if (!emailPrefill?.email) return

    const payload = {
      sessionId: SESSION_ID,           // ties all steps in this visit to one row
      email: emailPrefill?.email || '',
      q1: finalAnswers[1] || '',
      q2: finalAnswers[2] || '',
      q3: finalAnswers[3] || '',
      q4: Array.isArray(finalAnswers[4]) ? finalAnswers[4].join(' | ') : finalAnswers[4] || '',
      q5: finalAnswers[5] || '',
      q6: finalAnswers[6] || '',
    }

    fetch(SHEET_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    }).catch((err) => console.error('Sheet submit error:', err))
  }, [])

  // Refs to always get latest transition functions (avoids stale closures in setTimeout)
  const transitionToStepRef = useRef(null)
  const transitionToThankYouRef = useRef(null)

  const current = questions[currentStep]
  const totalQuestions = questions.length

  const currentAnswer = answers[current.id]
  const hasAnswer = (() => {
    if (current.type === 'multi') return currentAnswer && currentAnswer.length > 0
    return currentAnswer !== undefined && currentAnswer !== ''
  })()

  // Check if Q6 should be shown based on Q5 answer
  const shouldShowQ6 = (answer) => {
    return ['Unsure', 'Unlikely', 'Very unlikely'].includes(answer)
  }

  // Only show button on multi-select and text slides (single-select auto-advances)
  const showButton = current.type === 'multi' || current.type === 'text'
  const isFinalStep = currentStep === questions.length - 1

  // Button text logic
  const buttonText = (() => {
    if (isFinalStep) return 'Submit'
    // Q5 (index 4): show Submit if positive (goes straight to thank you)
    if (currentStep === 4) {
      if (currentAnswer && !shouldShowQ6(currentAnswer)) return 'Submit'
    }
    return 'Next'
  })()

  // Progress display
  const progressLabel = (() => {
    if (showThankYou) return 'Complete!'
    if (current.conditional && currentStep === questions.length - 1) return 'Complete!'
    return `${currentStep + 1} of ${totalQuestions}`
  })()

  const progressPercent = (() => {
    if (showThankYou) return 100
    if (current.conditional && currentStep === questions.length - 1) return 100
    return ((currentStep + 1) / totalQuestions) * 100
  })()

  // Initial sheet submission on mount
  useEffect(() => {
    // Submit immediately on load if we have an email (captures partial from email link)
    if (emailPrefill?.email) {
      submitToSheet(emailPrefill.answers)
      updateUrlParams(emailPrefill.answers)
    }
  }, [])

  // ─── Staggered entrance animation ───
  useLayoutEffect(() => {
    if (showThankYou) return

    const items = getAnimItems(formAreaRef.current)
    const btn = submitWrapRef.current

    gsap.set(items, { opacity: 0, y: 18, filter: 'blur(8px)' })
    if (btn) gsap.set(btn, { opacity: 0, y: 14, filter: 'blur(6px)' })

    const tl = gsap.timeline({ delay: 0.08 })

    items.forEach((el, i) => {
      tl.to(el, {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: DURATION_IN,
        ease: 'buttery',
      }, i * STAGGER_IN)
    })

    if (btn) {
      tl.to(btn, {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: DURATION_IN,
        ease: 'buttery',
      }, items.length * STAGGER_IN + 0.02)
    }

    return () => tl.kill()
  }, [currentStep, showThankYou])

  // ─── Transition to thank you: just flip the flag ───
  const transitionToThankYou = useCallback(() => {
    if (isAnimating || showThankYou) return
    setIsAnimating(true)
    setError('')
    setShowThankYou(true)
  }, [isAnimating, showThankYou])

  // ─── Animate thank-you overlay once it mounts ───
  useEffect(() => {
    if (!showThankYou || !thankYouRef.current) return

    const tyItems = getAnimItems(thankYouRef.current)
    gsap.set(thankYouRef.current, { opacity: 0 })
    gsap.set(tyItems, { opacity: 0, y: 24, filter: 'blur(10px)' })

    const tl = gsap.timeline({
      onComplete: () => setIsAnimating(false)
    })

    // Fade out the entire survey
    if (surveyContainerRef.current) {
      tl.to(surveyContainerRef.current, {
        opacity: 0,
        scale: 0.97,
        filter: 'blur(6px)',
        duration: 0.7,
        ease: 'power2.inOut',
      }, 0)
    }

    // Crossfade in the thank you backdrop
    tl.to(thankYouRef.current, {
      opacity: 1,
      duration: 0.8,
      ease: 'power2.inOut',
    }, 0.15)

    // Stagger in thank you content elements
    tyItems.forEach((el, i) => {
      tl.to(el, {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.7,
        ease: 'buttery',
      }, 0.4 + i * 0.12)
    })

    return () => tl.kill()
  }, [showThankYou])

  // ─── Staggered exit (no image slide) ───
  const transitionToStep = useCallback((nextStep) => {
    if (isAnimating) return
    setIsAnimating(true)
    setError('')

    const items = getAnimItems(formAreaRef.current)
    const btn = submitWrapRef.current
    const allEls = btn ? [...items, btn] : items

    const tl = gsap.timeline({
      onComplete: () => {
        setCurrentStep(nextStep)
        setIsAnimating(false)
      }
    })

    // Stagger out — reverse order for cascading feel
    const reversed = [...allEls].reverse()
    reversed.forEach((el, i) => {
      tl.to(el, {
        opacity: 0,
        y: -10,
        filter: 'blur(6px)',
        duration: DURATION_OUT,
        ease: 'smooth',
      }, i * STAGGER_OUT)
    })

  }, [isAnimating, currentStep])

  // Keep refs in sync
  transitionToStepRef.current = transitionToStep
  transitionToThankYouRef.current = transitionToThankYou

  // Single select — store value and auto-advance
  const handleSingleSelect = useCallback((option) => {
    if (isAnimating) return
    setError('')

    // Clear any pending auto-advance
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = null
    }

    const updated = { ...answersRef.current, [current.id]: option }
    answersRef.current = updated
    setAnswers(updated)
    updateUrlParams(updated)

    // Auto-advance after a beat so user sees their selection
    autoAdvanceTimer.current = setTimeout(() => {
      autoAdvanceTimer.current = null

      // Submit progress to sheet on every answer
      submitToSheet(updated)

      const nextStep = currentStep + 1
      const nextQuestion = questions[nextStep]

      // Check if next question is conditional and should be skipped
      if (nextQuestion && nextQuestion.conditional) {
        if (!shouldShowQ6(option)) {
          // Skip Q6, go straight to thank you
          transitionToThankYouRef.current?.()
          return
        }
      }

      // If this was the last step, go to thank you
      if (currentStep >= questions.length - 1) {
        transitionToThankYouRef.current?.()
        return
      }

      transitionToStepRef.current?.(nextStep)
    }, 350)
  }, [current.id, isAnimating, currentStep, submitToSheet, updateUrlParams])

  // Multi select toggle
  const handleMultiToggle = (option) => {
    if (isAnimating) return
    setError('')
    setAnswers(prev => {
      const existing = prev[current.id] || []
      const updated = existing.includes(option)
        ? existing.filter(o => o !== option)
        : [...existing, option]
      const newAnswers = { ...prev, [current.id]: updated }
      answersRef.current = newAnswers
      updateUrlParams(newAnswers)
      return newAnswers
    })
  }

  // Text input
  const handleTextChange = (value) => {
    setError('')
    const updated = { ...answersRef.current, [current.id]: value }
    answersRef.current = updated
    setAnswers(updated)
    updateUrlParams(updated)
  }

  // Submit / Next
  const handleSubmit = useCallback(() => {
    if (isAnimating || showThankYou) return

    // Cancel any pending auto-advance
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = null
    }

    // Only require an answer if the question is NOT conditional (Q6 is optional)
    if (!hasAnswer && !current.conditional) {
      setError('Please complete this question before continuing')
      return
    }
    setError('')

    // Submit progress to sheet on every step
    submitToSheet(answersRef.current)

    // If on final step, submit and go to thank you
    if (isFinalStep) {
      transitionToThankYou()
      return
    }

    // Determine next step
    const nextStep = currentStep + 1
    const nextQuestion = questions[nextStep]

    // If next question is conditional, check if it should show
    if (nextQuestion && nextQuestion.conditional) {
      const currentVal = currentAnswer
      if (!shouldShowQ6(currentVal)) {
        // Skip Q6, go straight to thank you
        transitionToThankYou()
        return
      }
    }

    transitionToStep(nextStep)
  }, [hasAnswer, isFinalStep, isAnimating, showThankYou, currentStep, currentAnswer, transitionToStep, transitionToThankYou, submitToSheet])

  // Enter key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !showThankYou && showButton) {
        e.preventDefault()
        handleSubmit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSubmit, showThankYou, showButton])

  useEffect(() => {
    setError('')
  }, [currentStep])

  // Clean up auto-advance timer
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    }
  }, [])

  return (
    <div className="sub-survey">
      <div className="survey-container" ref={surveyContainerRef}>
        {/* LEFT - Static Image */}
        <div className="survey-image-panel">
          <img src={STATIC_IMAGE} alt="" className="survey-image" />
        </div>

        {/* RIGHT - Form */}
        <div className="survey-form-panel">
          <div className="survey-logo-wrapper">
            <Logo className="survey-logo" />
          </div>

          <div className="survey-form-center">
            <div className="survey-progress-wrapper">
              <div className="survey-progress-label">{progressLabel}</div>
              <div className="survey-progress-track">
                <div className="survey-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="survey-form-scroll" ref={formAreaRef}>
              <div className="survey-content">
                <h2 className="anim-item survey-question">{current.question}</h2>
                {current.subtitle && (
                  <p className="anim-item survey-subtitle">{current.subtitle}</p>
                )}

                <div className="anim-item survey-options-wrapper">
                  <div className="survey-options">

                    {/* Single Select */}
                    {current.type === 'single' && current.options.map((opt) => (
                      <button
                        key={opt}
                        className={`option-btn ${currentAnswer === opt ? 'selected' : ''}`}
                        onClick={() => handleSingleSelect(opt)}
                      >
                        {opt}
                      </button>
                    ))}

                    {/* Multi Select */}
                    {current.type === 'multi' && current.options.map((opt) => {
                      const isChecked = (currentAnswer || []).includes(opt)
                      return (
                        <label key={opt} className={`option-checkbox ${isChecked ? 'selected' : ''}`}>
                          <input type="checkbox" checked={isChecked} onChange={() => handleMultiToggle(opt)} />
                          <span className="check-indicator">
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                          <span className="checkbox-label-text">{opt}</span>
                        </label>
                      )
                    })}

                    {/* Text */}
                    {current.type === 'text' && (
                      <textarea
                        className="option-textarea"
                        placeholder="Type your answer here..."
                        rows={5}
                        value={currentAnswer || ''}
                        onChange={(e) => handleTextChange(e.target.value)}
                      />
                    )}
                  </div>

                  <div className={`error-tooltip ${error ? 'visible' : ''}`}>{error}</div>
                </div>
              </div>

              {showButton && (
                <div ref={submitWrapRef} className="survey-submit">
                  <button className="submit-btn" onClick={handleSubmit}>
                    {buttonText}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Thank You — full-screen crossfade overlay */}
      {showThankYou && (
        <div ref={thankYouRef} className="thankyou-screen" style={{ opacity: 0 }}>
          <img src={THANK_YOU.image} alt="" className="thankyou-bg" />
          <div className="thankyou-overlay" />
          <div className="thankyou-content">
            <div className="anim-item"><Logo className="thankyou-logo" /></div>
            <h1 className="anim-item thankyou-heading" dangerouslySetInnerHTML={{ __html: THANK_YOU.heading }} />
            <p className="anim-item thankyou-body">
              {THANK_YOU.body}<br />
              Get started with our <a href={THANK_YOU.linkUrl}>{THANK_YOU.linkText}</a>!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default SubscriptionSurvey
