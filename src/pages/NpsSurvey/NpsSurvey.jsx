import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { questions } from './questions'
import Logo from '../../components/Logo'
import './NpsSurvey.css'

gsap.registerPlugin(CustomEase)

CustomEase.create('smooth', '0.22, 1, 0.36, 1')
CustomEase.create('buttery', '0.16, 1, 0.3, 1')
CustomEase.create('imageSlide', '0.45, 0, 0.55, 1')

const STAGGER_IN = 0.07
const STAGGER_OUT = 0.04
const DURATION_IN = 0.55
const DURATION_OUT = 0.28

// Parse ?nps= from URL on load
function getNpsFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const raw = params.get('nps')
  if (raw === null) return null
  const num = parseInt(raw, 10)
  if (isNaN(num) || num < 0 || num > 10) return null
  return num
}

// Compute initial state from URL param
function getInitialState() {
  const urlNps = getNpsFromUrl()
  if (urlNps !== null) {
    const initialAnswers = { 1: urlNps }
    const visible = getVisibleQuestions(initialAnswers, urlNps)
    const startStep = Math.min(1, visible.length - 1)
    return { answers: initialAnswers, step: startStep, fromUrl: true }
  }
  return { answers: {}, step: 0, fromUrl: false }
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

// Collect all .anim-item elements inside a container
function getAnimItems(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll('.anim-item'))
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
  const imagePanelRef = useRef(null)
  const currentImageRef = useRef(null)
  const nextImageRef = useRef(null)
  const thankYouRef = useRef(null)
  const surveyContainerRef = useRef(null)
  const autoAdvanceTimer = useRef(null)

  const answersRef = useRef(answers)
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  const npsScore = answers[1]
  const visibleQuestions = getVisibleQuestions(answers, npsScore)
  const current = visibleQuestions[currentStep]
  const thankyouIndex = visibleQuestions.findIndex(q => q.type === 'thankyou')

  // Track last survey question so form stays rendered during thank you crossfade
  const lastSurveyQ = useRef(null)
  if (current && current.type !== 'thankyou') {
    lastSurveyQ.current = current
  }
  const displayQ = showThankYou ? lastSurveyQ.current : current

  const isLastSurveyStep = currentStep === thankyouIndex - 1 || currentStep === visibleQuestions.length - 1

  const currentAnswer = answers[current?.id]
  const hasAnswer = (() => {
    if (!current) return false
    if (current.type === 'slider') return currentAnswer !== undefined
    return currentAnswer !== undefined && currentAnswer !== ''
  })()

  // Show button only on text/slider slides (scale auto-advances)
  const showButton = current?.type === 'text' || current?.type === 'slider'

  // Preload all images
  useEffect(() => {
    questions.forEach((q) => {
      if (q.image) {
        const img = new Image()
        img.src = q.image
      }
    })
  }, [])

  // ─── Staggered entrance animation ───
  useLayoutEffect(() => {
    if (showThankYou || !current || current.type === 'thankyou') return

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

  // ─── Transition to thank you: unified crossfade ───
  const transitionToThankYou = useCallback((nextStep) => {
    if (isAnimating) return
    setIsAnimating(true)
    setError('')

    // Immediately render the thank you screen (hidden)
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

      const tl = gsap.timeline({
        onComplete: () => setIsAnimating(false)
      })

      // Fade out the entire survey (form + image panel together)
      if (surveyContainerRef.current) {
        tl.to(surveyContainerRef.current, {
          opacity: 0,
          scale: 0.97,
          filter: 'blur(6px)',
          duration: 0.7,
          ease: 'power2.inOut',
        }, 0)
      }

      // Crossfade in the thank you backdrop, overlapping
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
    })
  }, [isAnimating])

  // ─── Staggered exit + image slide ───
  const transitionToStep = useCallback((nextStep) => {
    if (isAnimating) return
    setIsAnimating(true)
    setError('')

    const currentAnswers = { ...answersRef.current }
    const currentNps = currentAnswers[1]
    const freshVisible = getVisibleQuestions(currentAnswers, currentNps)
    const nextQuestion = freshVisible[nextStep]

    // Thank you → use dedicated crossfade
    if (nextQuestion?.type === 'thankyou') {
      setIsAnimating(false) // transitionToThankYou will re-set this
      transitionToThankYou(nextStep)
      return
    }

    const items = getAnimItems(formAreaRef.current)
    const btn = submitWrapRef.current
    const allEls = btn ? [...items, btn] : items

    // Build exit timeline
    const tl = gsap.timeline({
      onComplete: () => {
        setCurrentStep(nextStep)
        setIsAnimating(false)
      }
    })

    // Stagger out — reverse order for a nice cascading feel
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

    // Slide images
    if (
      currentImageRef.current &&
      nextImageRef.current &&
      imagePanelRef.current &&
      nextQuestion?.image
    ) {
      const currentQ = freshVisible[currentStep] || current
      const imageChanging = currentQ?.image !== nextQuestion.image

      if (imageChanging) {
        const panelHeight = imagePanelRef.current.offsetHeight

        nextImageRef.current.src = nextQuestion.image
        gsap.set(nextImageRef.current, { y: panelHeight, opacity: 1, force3D: true })
        gsap.set(currentImageRef.current, { force3D: true })

        tl.to(currentImageRef.current, {
          y: -panelHeight,
          duration: 0.7,
          ease: 'imageSlide',
          force3D: true,
        }, 0)

        tl.to(nextImageRef.current, {
          y: 0,
          duration: 0.7,
          ease: 'imageSlide',
          force3D: true,
        }, 0)
      }
    }

  }, [isAnimating, transitionToThankYou, currentStep, current])

  // Reset images after step change
  useEffect(() => {
    if (showThankYou || !current || current.type === 'thankyou') return
    if (currentImageRef.current) {
      currentImageRef.current.src = current.image
      gsap.set(currentImageRef.current, { y: 0, opacity: 1 })
    }
    if (nextImageRef.current) {
      gsap.set(nextImageRef.current, { y: 0, opacity: 0 })
    }
  }, [currentStep, showThankYou])

  // Scale select — store value and auto advance
  const handleScaleSelect = useCallback((value) => {
    if (isAnimating) return
    setError('')

    // Clear any pending auto-advance
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = null
    }

    const updated = { ...answersRef.current, [current.id]: value }
    answersRef.current = updated
    setAnswers(updated)

    // Auto-advance after a beat so user sees their selection
    autoAdvanceTimer.current = setTimeout(() => {
      autoAdvanceTimer.current = null
      const freshVisible = getVisibleQuestions(updated, updated[1])
      const nextStep = currentStep + 1
      if (nextStep < freshVisible.length) {
        transitionToStep(nextStep)
      }
    }, 80)
  }, [current?.id, isAnimating, currentStep, transitionToStep])

  // Clean up auto-advance timer
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    }
  }, [])

  // Text input
  const handleTextChange = (value) => {
    setError('')
    const updated = { ...answersRef.current, [current.id]: value }
    answersRef.current = updated
    setAnswers(updated)
  }

  // Submit / next
  const handleSubmit = useCallback(() => {
    if (isAnimating) return

    // If scale auto-advance is pending, cancel it — the user clicked manually
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = null
    }

    if (!hasAnswer) {
      setError('Please complete this question before continuing')
      return
    }
    setError('')

    console.log('Survey answers so far:', answersRef.current)
    transitionToStep(currentStep + 1)
  }, [hasAnswer, isAnimating, currentStep, transitionToStep])

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

  useEffect(() => {
    setError('')
  }, [currentStep])

  // ─── Thank you data ───
  const tyData = visibleQuestions.find(q => q.type === 'thankyou')

  if (!displayQ) return null

  return (
    <div className="nps-survey">
      <div className="survey-container" ref={surveyContainerRef}>
        <div className="survey-image-panel" ref={imagePanelRef}>
          <img ref={currentImageRef} src={displayQ.image} alt="" className="survey-image" />
          <img ref={nextImageRef} src="" alt="" className="survey-image" style={{ opacity: 0 }} />
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

      {showThankYou && tyData && (
        <div ref={thankYouRef} className="thankyou-screen" style={{ opacity: 0 }}>
          <img src={tyData.image} alt="" className="thankyou-bg" />
          <div className="thankyou-overlay" />
          <div className="thankyou-content">
            <div className="anim-item"><Logo className="thankyou-logo" /></div>
            <h1 className="anim-item thankyou-heading" dangerouslySetInnerHTML={{ __html: tyData.heading }} />
            <p className="anim-item thankyou-body">
              {tyData.body}<br />
              Get started with our <a href={tyData.linkUrl}>{tyData.linkText}</a>!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default NpsSurvey
