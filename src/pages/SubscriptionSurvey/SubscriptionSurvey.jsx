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
  body: 'Your responses help us make PrettyBoy even better.',
}

// ─── Unique session ID generated once per page visit ───
const SESSION_ID = Math.random().toString(36).substring(2) + Date.now().toString(36)

// Q3 (conditional) only shows if Q2 answer is Unsure, Unlikely, or Very unlikely
const shouldShowQ3 = (answer) =>
  ['Unsure', 'Unlikely', 'Very unlikely'].includes(answer)

// Step index constants
const STEP_Q1 = 0
const STEP_Q2 = 1
const STEP_Q3 = 2

function getAnimItems(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll('.anim-item'))
}

function getEmailPrefill() {
  try {
    const params = new URLSearchParams(window.location.search)
    const email = params.get('email') || ''
    const qParam = params.get('question') || params.get('q')
    const aParam = params.get('answer') ?? params.get('a')

    if (!qParam || aParam === null) return { email, answers: {}, startStep: 0 }

    const qIndex = parseInt(qParam, 10) - 1
    if (isNaN(qIndex) || qIndex < 0 || qIndex >= questions.length)
      return { email, answers: {}, startStep: 0 }

    const question = questions[qIndex]
    if (!question.options) return { email, answers: {}, startStep: 0 }

    const aIndex = parseInt(aParam, 10) - 1
    if (isNaN(aIndex) || aIndex < 0 || aIndex >= question.options.length)
      return { email, answers: {}, startStep: 0 }

    const answerValue = question.options[aIndex]
    let startStep = qIndex + 1
    if (startStep >= questions.length) startStep = questions.length - 1

    return { email, answers: { [question.id]: answerValue }, startStep }
  } catch {
    return { email: '', answers: {}, startStep: 0 }
  }
}

const emailPrefill = getEmailPrefill()

function BackIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: 'scaleX(-1)' }}
    >
      <path d="M15 10L20 15L15 20" stroke="currentColor" strokeMiterlimit="10" />
      <path d="M4 4V12L7 15H20" stroke="currentColor" strokeMiterlimit="10" />
    </svg>
  )
}

function SubscriptionSurvey() {
  const [currentStep, setCurrentStep] = useState(emailPrefill?.startStep ?? 0)
  const [answers, setAnswers] = useState(emailPrefill?.answers ?? {})
  const [error, setError] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)

  const formAreaRef = useRef(null)
  const thankYouRef = useRef(null)
  const surveyContainerRef = useRef(null)
  const autoAdvanceTimer = useRef(null)

  const answersRef = useRef(emailPrefill?.answers ?? {})
  useEffect(() => { answersRef.current = answers }, [answers])

  // ─── Set browser tab title ───
  useEffect(() => {
    document.title = 'PrettyBoy Feedback'
  }, [])

  // ─── Update URL params ───
  const updateUrlParams = useCallback((updatedAnswers) => {
    if (!emailPrefill?.email) return
    const params = new URLSearchParams()
    params.set('email', emailPrefill.email)
    Object.entries(updatedAnswers).forEach(([qId, value]) => {
      if (value !== undefined && value !== '') {
        params.set(`q${qId}`, value)
      }
    })
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
  }, [])

  // ─── Submit to Google Sheet ───
  const submitToSheet = useCallback((finalAnswers) => {
    if (!emailPrefill?.email) return

    const payload = {
      sessionId: SESSION_ID,
      email: emailPrefill?.email || '',
      q1: finalAnswers[1] || '',
      q2: finalAnswers[2] || '',
      q3: finalAnswers[3] || '',
    }

    fetch(SHEET_URL, { method: 'POST', body: JSON.stringify(payload) })
      .catch((err) => console.error('Sheet submit error:', err))
  }, [])

  const transitionToStepRef = useRef(null)
  const transitionToThankYouRef = useRef(null)

  const current = questions[currentStep]
  const currentAnswer = answers[current.id]

  const hasAnswer = currentAnswer !== undefined && currentAnswer !== ''

  const showBackButton = currentStep > 0 && !showThankYou

  // ─── Progress calculation ───
  const visibleStepCount = shouldShowQ3(answers[2]) ? 3 : 2

  const visibleStepNumber = (() => {
    if (currentStep === STEP_Q1) return 1
    if (currentStep === STEP_Q2) return 2
    if (currentStep === STEP_Q3) return 3
    return currentStep + 1
  })()

  const progressLabel = showThankYou ? 'Complete!' : `${visibleStepNumber} of ${visibleStepCount}`
  const progressPercent = showThankYou ? 100 : (visibleStepNumber / visibleStepCount) * 100

  // ─── Initial sheet submission on mount ───
  useEffect(() => {
    if (emailPrefill?.email) {
      submitToSheet(emailPrefill.answers)
      updateUrlParams(emailPrefill.answers)
    }
  }, [])

  // ─── Staggered entrance animation ───
  useLayoutEffect(() => {
    if (showThankYou) return
    const scrollEl = formAreaRef.current
    const items = getAnimItems(scrollEl)

    gsap.set(items, { opacity: 0, y: 18, filter: 'blur(8px)' })

    // Smoothly animate the container from its frozen height back to natural size
    gsap.to(scrollEl, {
      height: 'auto',
      duration: DURATION_IN,
      ease: 'buttery',
      clearProps: 'height,overflow'
    })

    const tl = gsap.timeline({ delay: 0.08 })
    items.forEach((el, i) => {
      tl.to(el, { opacity: 1, y: 0, filter: 'blur(0px)', duration: DURATION_IN, ease: 'buttery' }, i * STAGGER_IN)
    })
    return () => tl.kill()
  }, [currentStep, showThankYou])

  // ─── Transition to thank you ───
  const transitionToThankYou = useCallback(() => {
    if (isAnimating || showThankYou) return
    setIsAnimating(true)
    setError('')
    setShowThankYou(true)
  }, [isAnimating, showThankYou])

  // ─── Animate thank-you overlay ───
  useEffect(() => {
    if (!showThankYou || !thankYouRef.current) return
    const tyItems = getAnimItems(thankYouRef.current)
    gsap.set(thankYouRef.current, { opacity: 0 })
    gsap.set(tyItems, { opacity: 0, y: 24, filter: 'blur(10px)' })

    const tl = gsap.timeline({ onComplete: () => setIsAnimating(false) })
    if (surveyContainerRef.current) {
      tl.to(surveyContainerRef.current, { opacity: 0, scale: 0.97, filter: 'blur(6px)', duration: 0.7, ease: 'power2.inOut' }, 0)
    }
    tl.to(thankYouRef.current, { opacity: 1, duration: 0.8, ease: 'power2.inOut' }, 0.15)
    tyItems.forEach((el, i) => {
      tl.to(el, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, ease: 'buttery' }, 0.4 + i * 0.12)
    })
    return () => tl.kill()
  }, [showThankYou])

  // ─── Animate out helper ───
  const animateOut = useCallback((nextStep, direction = 'forward') => {
    const scrollEl = formAreaRef.current

    // Freeze height NOW so React's content swap doesn't cause a layout jump
    gsap.set(scrollEl, { height: scrollEl.offsetHeight, overflow: 'hidden' })

    const items = getAnimItems(scrollEl)
    const tl = gsap.timeline({
      onComplete: () => { setCurrentStep(nextStep); setIsAnimating(false) }
    })
    const reversed = [...items].reverse()
    reversed.forEach((el, i) => {
      tl.to(el, {
        opacity: 0,
        y: direction === 'forward' ? -10 : 10,
        filter: 'blur(6px)',
        duration: DURATION_OUT,
        ease: 'smooth'
      }, i * STAGGER_OUT)
    })
  }, [])

  // ─── Transition forward ───
  const transitionToStep = useCallback((nextStep) => {
    if (isAnimating) return
    setIsAnimating(true)
    setError('')
    animateOut(nextStep, 'forward')
  }, [isAnimating, animateOut])

  // ─── Transition backward ───
  const transitionToPrevStep = useCallback(() => {
    if (isAnimating || currentStep === 0) return
    setIsAnimating(true)
    setError('')

    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = null
    }

    animateOut(currentStep - 1, 'backward')
  }, [isAnimating, currentStep, animateOut])

  // Keep refs in sync
  transitionToStepRef.current = transitionToStep
  transitionToThankYouRef.current = transitionToThankYou

  // ─── Single select — auto-advance ───
  const handleSingleSelect = useCallback((option) => {
    if (isAnimating) return
    setError('')

    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = null
    }

    const updated = { ...answersRef.current, [current.id]: option }
    answersRef.current = updated
    setAnswers(updated)
    updateUrlParams(updated)

    autoAdvanceTimer.current = setTimeout(() => {
      autoAdvanceTimer.current = null
      submitToSheet(updated)

      // Leaving Q2: show Q3 if triggered, otherwise thank you
      if (currentStep === STEP_Q2) {
        if (shouldShowQ3(option)) {
          transitionToStepRef.current?.(STEP_Q3)
        } else {
          transitionToThankYouRef.current?.()
        }
        return
      }

      // Q3 is the last question — always go to thank you
      if (currentStep === STEP_Q3) {
        transitionToThankYouRef.current?.()
        return
      }

      // Default: advance to next step
      transitionToStepRef.current?.(currentStep + 1)
    }, 350)
  }, [current.id, isAnimating, currentStep, submitToSheet, updateUrlParams])

  // Cleanup auto-advance timer on unmount
  useEffect(() => {
    return () => { if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current) }
  }, [])

  useEffect(() => { setError('') }, [currentStep])

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
                    {current.options.map((opt) => (
                      <button
                        key={opt}
                        className={`option-btn ${currentAnswer === opt ? 'selected' : ''}`}
                        onClick={() => handleSingleSelect(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <div className={`error-tooltip ${error ? 'visible' : ''}`}>{error}</div>
                </div>
              </div>

              {/* Bottom row: back button only */}
              <div className="survey-bottom-row">
                <button
                  className={`back-btn ${showBackButton ? 'visible' : ''}`}
                  onClick={transitionToPrevStep}
                  aria-label="Go back"
                  tabIndex={showBackButton ? 0 : -1}
                >
                  <BackIcon />
                </button>
              </div>
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
            <div className="anim-item"><Logo className="thankyou-logo" variant="white" /></div>
            <h1 className="anim-item thankyou-heading" dangerouslySetInnerHTML={{ __html: THANK_YOU.heading }} />
            <p className="anim-item thankyou-body">{THANK_YOU.body}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default SubscriptionSurvey