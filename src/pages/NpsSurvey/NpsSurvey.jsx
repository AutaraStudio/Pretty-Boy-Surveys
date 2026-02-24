import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { questions } from './questions'
import Logo from '../../components/Logo'
// NpsSurvey.jsx
import './NpsSurvey.css'


gsap.registerPlugin(CustomEase)

CustomEase.create('smooth', '0.22, 1, 0.36, 1')
CustomEase.create('buttery', '0.16, 1, 0.3, 1')

const STAGGER_IN = 0.07
const STAGGER_OUT = 0.04
const DURATION_IN = 0.55
const DURATION_OUT = 0.28

const STATIC_IMAGE = '/images/nps/survey-image.webp'

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbyhliXUiqU8dGP21BpcTWKBwfMvzFYZqWCcdmWYWTGlJu9fQ5VF6zEliEiDqp21Xieg/exec'

// ─── Unique session ID generated once per page visit ───
const SESSION_ID = Math.random().toString(36).substring(2) + Date.now().toString(36)

// Parse ?email= and ?nps= from URL on load
function getNpsFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const email = (params.get('email') || '').trim()
  const raw = params.get('nps')
  if (raw === null) return { email, nps: null }
  const num = parseInt(raw, 10)
  if (isNaN(num) || num < 0 || num > 10) return { email, nps: null }
  return { email, nps: num }
}

// Compute initial state from URL param
function getInitialState() {
  const { email, nps: urlNps } = getNpsFromUrl()
  if (urlNps !== null) {
    const initialAnswers = { 1: urlNps }
    const visible = getVisibleQuestions(initialAnswers, urlNps)
    const startStep = Math.min(1, visible.length - 1)
    return { answers: initialAnswers, step: startStep, fromUrl: true, email }
  }
  return { answers: {}, step: 0, fromUrl: false, email }
}

// Helper to evaluate showIf conditions
function evalCondition(showIf, npsScore, answers) {
  if (!showIf) return true
  const { field, op, min, max, value } = showIf
  const answer = field === 'nps_score' ? npsScore : answers[field]
  if (answer === undefined || answer === null) return false
  if (op === 'between') return answer >= min && answer <= max
  if (op === '>=') return answer >= value
  if (op === '<=') return answer <= value
  return true
}

function getVisibleQuestions(answers, npsScore) {
  return questions.filter((q) => evalCondition(q.showIf, npsScore, answers))
}

function getAnimItems(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll('.anim-item'))
}

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

function NpsSurvey() {
  const initial = useRef(getInitialState()).current

  const [currentStep, setCurrentStep] = useState(initial.step)
  const [answers, setAnswers] = useState(initial.answers)
  const [error, setError] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)

  const formAreaRef = useRef(null)
  const submitWrapRef = useRef(null)
  const thankYouRef = useRef(null)
  const surveyContainerRef = useRef(null)
  const autoAdvanceTimer = useRef(null)

  const answersRef = useRef(answers)
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  // ─── Set browser tab title ───
  useEffect(() => {
    document.title = 'PrettyBoy Feedback'
  }, [])

  // ─── Update URL params ───
  const updateUrlParams = useCallback((updatedAnswers) => {
    if (!initial.email) return
    const params = new URLSearchParams()
    params.set('email', initial.email)
    Object.entries(updatedAnswers).forEach(([qId, value]) => {
      if (value !== undefined && value !== '') {
        params.set(`q${qId}`, value)
      }
    })
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
  }, [])

  // ─── Submit to Google Sheet ───
  const submitToSheet = useCallback((finalAnswers) => {
    if (!initial.email) return

    const npsVal = finalAnswers[1]
    const visibleQs = getVisibleQuestions(finalAnswers, npsVal)
    const textQ = visibleQs.find(q => q.type === 'text')
    const response = textQ ? (finalAnswers[textQ.id] || '') : ''

    const payload = {
      type: 'nps',
      sessionId: SESSION_ID,
      email: initial.email,
      nps: npsVal !== undefined && npsVal !== null ? String(npsVal) : '',
      response: response,
    }

    fetch(SHEET_URL, { method: 'POST', body: JSON.stringify(payload) })
      .catch((err) => console.error('Sheet submit error:', err))
  }, [])

  // Initial sheet submission on mount
  useEffect(() => {
    if (initial.email) {
      submitToSheet(initial.answers)
      updateUrlParams(initial.answers)
    }
  }, [])

  const npsScore = answers[1]
  const visibleQuestions_ = getVisibleQuestions(answers, npsScore)
  const current = visibleQuestions_[currentStep]

  // Track last survey question so form stays rendered during thank you crossfade
  const lastSurveyQ = useRef(null)
  if (current && current.type !== 'thankyou') {
    lastSurveyQ.current = current
  }
  const displayQ = showThankYou ? lastSurveyQ.current : current

  const currentAnswer = answers[current?.id]
  const hasAnswer = (() => {
    if (!current) return false
    if (current.type === 'slider') return currentAnswer !== undefined
    return currentAnswer !== undefined && currentAnswer !== ''
  })()

  const showButton = current?.type === 'text' || current?.type === 'slider'
  const showBackButton = currentStep > 0 && !showThankYou

  // ─── Staggered entrance animation ───
  useLayoutEffect(() => {
    if (showThankYou || !current || current.type === 'thankyou') return

    const items = getAnimItems(formAreaRef.current)
    const btn = submitWrapRef.current

    gsap.set(items, { opacity: 0, y: 18, filter: 'blur(8px)' })
    if (btn) gsap.set(btn, { opacity: 0, y: 14, filter: 'blur(6px)' })

    const tl = gsap.timeline({ delay: 0.08 })
    items.forEach((el, i) => {
      tl.to(el, { opacity: 1, y: 0, filter: 'blur(0px)', duration: DURATION_IN, ease: 'buttery' }, i * STAGGER_IN)
    })
    if (btn) {
      tl.to(btn, { opacity: 1, y: 0, filter: 'blur(0px)', duration: DURATION_IN, ease: 'buttery' }, items.length * STAGGER_IN + 0.02)
    }

    return () => tl.kill()
  }, [currentStep, showThankYou])

  // ─── Transition to thank you: unified crossfade ───
  const transitionToThankYou = useCallback((nextStep) => {
    if (isAnimating) return
    setIsAnimating(true)
    setError('')
    setShowThankYou(true)
    setCurrentStep(nextStep)

    requestAnimationFrame(() => {
      if (!thankYouRef.current) {
        setIsAnimating(false)
        return
      }

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
    })
  }, [isAnimating])

  // ─── Transition forward ───
  const transitionToStep = useCallback((nextStep) => {
    if (isAnimating) return
    setIsAnimating(true)
    setError('')

    const currentAnswers = { ...answersRef.current }
    const currentNps = currentAnswers[1]
    const freshVisible = getVisibleQuestions(currentAnswers, currentNps)
    const nextQuestion = freshVisible[nextStep]

    if (nextQuestion?.type === 'thankyou') {
      setIsAnimating(false)
      transitionToThankYou(nextStep)
      return
    }

    const items = getAnimItems(formAreaRef.current)
    const btn = submitWrapRef.current
    const allEls = btn ? [...items, btn] : items

    const tl = gsap.timeline({
      onComplete: () => { setCurrentStep(nextStep); setIsAnimating(false) }
    })
    const reversed = [...allEls].reverse()
    reversed.forEach((el, i) => {
      tl.to(el, { opacity: 0, y: -10, filter: 'blur(6px)', duration: DURATION_OUT, ease: 'smooth' }, i * STAGGER_OUT)
    })
  }, [isAnimating, transitionToThankYou, currentStep, current])

  // ─── Transition backward ───
  const transitionToPrevStep = useCallback(() => {
    if (isAnimating || currentStep === 0) return
    setIsAnimating(true)
    setError('')

    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = null
    }

    const items = getAnimItems(formAreaRef.current)
    const btn = submitWrapRef.current
    const allEls = btn ? [...items, btn] : items
    const prevStep = currentStep - 1

    const tl = gsap.timeline({
      onComplete: () => { setCurrentStep(prevStep); setIsAnimating(false) }
    })
    const reversed = [...allEls].reverse()
    reversed.forEach((el, i) => {
      tl.to(el, { opacity: 0, y: 10, filter: 'blur(6px)', duration: DURATION_OUT, ease: 'smooth' }, i * STAGGER_OUT)
    })
  }, [isAnimating, currentStep])

  // ─── Scale select — store value and auto advance ───
  const handleScaleSelect = useCallback((value) => {
    if (isAnimating) return
    setError('')

    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = null
    }

    const updated = { ...answersRef.current, [current.id]: value }
    answersRef.current = updated
    setAnswers(updated)
    updateUrlParams(updated)

    submitToSheet(updated)

    autoAdvanceTimer.current = setTimeout(() => {
      autoAdvanceTimer.current = null
      const freshVisible = getVisibleQuestions(updated, updated[1])
      const nextStep = currentStep + 1
      if (nextStep < freshVisible.length) {
        transitionToStep(nextStep)
      }
    }, 80)
  }, [current?.id, isAnimating, currentStep, transitionToStep, submitToSheet, updateUrlParams])

  useEffect(() => {
    return () => { if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current) }
  }, [])

  // ─── Text input ───
  const handleTextChange = (value) => {
    setError('')
    const updated = { ...answersRef.current, [current.id]: value }
    answersRef.current = updated
    setAnswers(updated)
    updateUrlParams(updated)
  }

  // ─── Submit / next ───
  const handleSubmit = useCallback(() => {
    if (isAnimating) return

    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = null
    }

    if (!hasAnswer) {
      setError('Please complete this question before continuing')
      return
    }
    setError('')

    submitToSheet(answersRef.current)
    transitionToStep(currentStep + 1)
  }, [hasAnswer, isAnimating, currentStep, transitionToStep, submitToSheet])

  // Enter key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && showButton) {
        e.preventDefault()
        handleSubmit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSubmit, showButton])

  useEffect(() => { setError('') }, [currentStep])

  // ─── Thank you data ───
  const tyData = visibleQuestions_.find(q => q.type === 'thankyou')

  if (!displayQ) return null

  return (
    <div className="nps-survey">
      <div className="survey-container" ref={surveyContainerRef}>
        <div className="survey-image-panel">
          <img src={STATIC_IMAGE} alt="" className="survey-image" />
        </div>

        <div className="survey-form-panel">
          <div className="survey-logo-wrapper">
            <Logo className="survey-logo" />
          </div>

          <div className="survey-form-scroll" ref={formAreaRef}>
            <div className="survey-content">
              <h2 className="anim-item survey-question" dangerouslySetInnerHTML={{ __html: displayQ.question }} />

              {displayQ.subtitle && <p className="anim-item survey-subtitle">{displayQ.subtitle}</p>}
              {displayQ.description && <p className="anim-item survey-description">{displayQ.description}</p>}

              <div className="anim-item survey-options-wrapper">
                <div className="survey-options">

                  {displayQ.type === 'scale' && (
                    <div className="scale-container">
                      <div className="scale-buttons">
                        {Array.from({ length: displayQ.max - displayQ.min + 1 }, (_, i) => {
                          const val = displayQ.min + i
                          const isSelected = currentAnswer === val
                          const inRange = currentAnswer !== undefined && currentAnswer !== null && val <= currentAnswer && val > displayQ.min
                          return (
                            <button
                              key={val}
                              className={`scale-btn ${isSelected ? 'selected' : inRange ? 'in-range' : ''}`}
                              onClick={() => handleScaleSelect(val)}
                            >
                              {val}
                            </button>
                          )
                        })}
                      </div>
                      <div className="scale-labels">
                        <span className="scale-label">{displayQ.minLabel}</span>
                        <span className="scale-label">{displayQ.maxLabel}</span>
                      </div>
                    </div>
                  )}

                  {displayQ.type === 'text' && (
                    <textarea
                      className="option-textarea"
                      placeholder={displayQ.placeholder || 'Type your answer here...'}
                      rows={5}
                      value={currentAnswer || ''}
                      onChange={(e) => handleTextChange(e.target.value)}
                    />
                  )}
                </div>

                <div className={`error-tooltip ${error ? 'visible' : ''}`}>{error}</div>
              </div>
            </div>

            {/* Bottom row: back button left, next/submit right */}
            <div className="survey-bottom-row">
              <button
                className={`back-btn ${showBackButton ? 'visible' : ''}`}
                onClick={transitionToPrevStep}
                aria-label="Go back"
                tabIndex={showBackButton ? 0 : -1}
              >
                <BackIcon />
              </button>

              {showButton && !showThankYou && (
                <div ref={submitWrapRef} className="survey-submit">
                  <button className="submit-btn" onClick={handleSubmit}>
                    {displayQ.type === 'scale' ? 'Next' : 'Submit'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showThankYou && tyData && (
        <div ref={thankYouRef} className="thankyou-screen" style={{ opacity: 0 }}>
          <img src={tyData.image} alt="" className="thankyou-bg" />
          <div className="thankyou-overlay" />
          <div className="thankyou-content">
            <div className="anim-item"><Logo className="thankyou-logo" variant="white" /></div>
            <h1 className="anim-item thankyou-heading" dangerouslySetInnerHTML={{ __html: tyData.heading }} />
            <p className="anim-item thankyou-body">{tyData.body}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default NpsSurvey