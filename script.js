// Update date automatically
function updateDate() {
    const date = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    document.getElementById('updateDate').textContent = 
        `Latest rate As Of ${date.toLocaleDateString('en-US', options)}`;
}
updateDate();

// Notification system
class NotificationSystem {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
    }
    
    show(message, type = 'success', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const messageText = document.createElement('span');
        messageText.textContent = message;
        notification.appendChild(messageText);
        
        if (type !== 'loading') {
            const closeButton = document.createElement('span');
            closeButton.className = 'notification-close';
            closeButton.innerHTML = '×';
            closeButton.onclick = () => this.hide(notification);
            notification.appendChild(closeButton);
        }
        
        this.container.appendChild(notification);
        
        // Trigger reflow for animation
        notification.offsetHeight;
        notification.classList.add('show');
        
        if (duration && type !== 'loading') {
            setTimeout(() => this.hide(notification), duration);
        }
        
        return notification;
    }
    
    hide(notification) {
        notification.style.transform = 'translateX(120%)';
        setTimeout(() => notification.remove(), 200);
    }
}


function showError(field, message) {
    removeError(field);
    field.classList.add('error-field');
    notifications.show(message, 'error');
}

function removeError(field) {
    field.classList.remove('error-field');
}

function validateField(field) {
    // Check radio groups
    if (field.type === 'radio') {
        const radioGroup = field.closest('.tlc-radio-group');
        const checkedRadio = radioGroup.querySelector('input[type="radio"]:checked');
        if (!checkedRadio) {
            const fieldName = radioGroup.previousElementSibling.textContent;
            showError(field, `Please select an option for ${fieldName}`);
            return false;
        }
        return true;
    }

    if (!field.value.trim()) {
        const fieldName = field.previousElementSibling.textContent;
        showError(field, `Please fill out ${fieldName}`);
        return false;
    }
    
    // Additional validation for specific fields
    if (field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(field.value.trim())) {
            showError(field, 'Please enter a valid email address');
            return false;
        }
    }
    
    if (field.type === 'tel') {
        const phoneRegex = /^\+?[0-9]{8,}$/;
        if (!phoneRegex.test(field.value.replace(/\s/g, ''))) {
            showError(field, 'Please enter a valid contact number');
            return false;
        }
    }

    if (field.type === 'number') {
        if (field.placeholder.includes('loan amount') && field.value <= 0) {
            showError(field, 'Please enter a valid loan amount');
            return false;
        }
        if (field.placeholder.includes('loan tenure') && (field.value <= 0 || field.value > 35)) {
            showError(field, 'Loan tenure must be between 1 and 35 years');
            return false;
        }
    }
    
    removeError(field);
    return true;
}

function nextPage() {
    const page1 = document.getElementById('page1');
    const page2 = document.getElementById('page2');
    
    const requiredFields = page1.querySelectorAll('input[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });

    if (isValid) {
        page1.classList.remove('active');
        page2.classList.add('active');
    }
}

function previousPage() {
    const page1 = document.getElementById('page1');
    const page2 = document.getElementById('page2');
    page2.classList.remove('active');
    page1.classList.add('active');
}

// Initialize notification system
const notifications = new NotificationSystem();

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loanForm');
    const scriptURL = 'https://script.google.com/macros/s/AKfycby3pBqk7IwhxPy2i-QGZU9oUqUfPlF-5Rklt5LKluaYGvDbg-b48_MogK7D12NNuDzy/exec';
    
    // Add names to form fields to ensure proper data submission
    const formFields = {
        'loan_type': 'What are you looking for?',
        'property_type': 'Property Type',
        'property_purchase': 'Property Purchase',
        'loan_amount': 'Loan Amount (SGD)',
        'rate_type': 'Rate Type',
        'name': 'Name',
        'email': 'Email',
        'contact': 'Contact Number'
    };

    // Add name attributes to fields based on their labels
    Object.entries(formFields).forEach(([name, label]) => {
        const field = Array.from(form.querySelectorAll('input, select'))
            .find(el => el.closest('label')?.textContent.trim() === label || 
                        el.previousElementSibling?.textContent.trim() === label);
        if (field) field.name = name;
    });
    
    // Add real-time validation on blur
    form.addEventListener('blur', function(e) {
        if (e.target.hasAttribute('required')) {
            validateField(e.target);
        }
    }, true);

    // Handle form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const currentPage = document.querySelector('.tlc-form-page.active');
        const requiredFields = currentPage.querySelectorAll('input[required], select[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!validateField(field)) {
                isValid = false;
            }
        });

        if (isValid) {
            const loadingNotification = notifications.show('Processing your loan request...', 'loading', 0);
            
            // Create FormData and explicitly append all form fields
            const formData = new FormData(form);
            
            // Append radio button selections
            const radioGroups = ['loan_type', 'property_type', 'property_purchase', 'rate_type'];
            radioGroups.forEach(groupName => {
                const selectedRadio = form.querySelector(`input[name="${groupName}"]:checked`);
                if (selectedRadio) {
                    formData.set(groupName, selectedRadio.value);
                }
            });
            
            // Add submission timestamp
            formData.append('submission_date', new Date().toISOString());
            
            // Log form data for debugging
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value}`);
            }
            
            fetch(scriptURL, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (response.ok) {
                    form.reset();
                    notifications.hide(loadingNotification);
                    notifications.show("Your loan request has been submitted successfully! We'll contact you soon with the best rates.", 'success');
                    // Reset to first page
                    const page2 = document.getElementById('page2');
                    const page1 = document.getElementById('page1');
                    if (page2.classList.contains('active')) {
                        page2.classList.remove('active');
                        page1.classList.add('active');
                    }
                } else {
                    throw new Error('Network response was not ok.');
                }
            })
            .catch(error => {
                console.error('Error!', error.message);
                notifications.hide(loadingNotification);
                notifications.show('There was an error submitting your form. Please try again.', 'error');
            });
        }
    });
});
// Carousel Section 
class AutoScrollCarousel {
    constructor() {
      this.track = document.querySelector('.tlc-partners-track');
      this.slides = [...document.querySelectorAll('.tlc-partners-slide')];
      this.slideWidth = this.slides[0].getBoundingClientRect().width;
      this.currentPosition = 0;
      this.scrollSpeed = 1; // Pixels per frame
      this.isHovered = false;

      this.initializeCarousel();
    }

    initializeCarousel() {
      // Add event listeners for pause on hover
      this.track.addEventListener('mouseenter', () => this.isHovered = true);
      this.track.addEventListener('mouseleave', () => this.isHovered = false);

      // Start the animation
      this.animate();

      // Handle window resize
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          this.slideWidth = this.slides[0].getBoundingClientRect().width;
        }, 250);
      });
    }

    animate() {
      const animate = () => {
        if (!this.isHovered) {
          this.currentPosition -= this.scrollSpeed;
          const resetPosition = -(this.slideWidth + 20) * 9; // Reset after original slides
          
          if (this.currentPosition <= resetPosition) {
            this.currentPosition = 0;
          }
          
          this.track.style.transform = `translateX(${this.currentPosition}px)`;
        }
        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    }
  }

  // Initialize the carousel when the DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    new AutoScrollCarousel();
  });

  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
        // Toggle active class on the question
        question.classList.toggle('active');
        
        // Toggle active class on the answer
        const answer = question.nextElementSibling;
        answer.classList.toggle('active');
        
        // Close other answers
        document.querySelectorAll('.faq-answer').forEach(otherAnswer => {
            if (otherAnswer !== answer) {
                otherAnswer.classList.remove('active');
                otherAnswer.previousElementSibling.classList.remove('active');
            }
        });
    });
});


 // Update radio button labels to improve readability
 document.addEventListener('DOMContentLoaded', function() {
    const radioGroups = document.querySelectorAll('.tlc-radio-group');
    
    radioGroups.forEach(group => {
        const radioButtons = group.querySelectorAll('input[type="radio"]');
        
        radioButtons.forEach(radio => {
            const labelText = radio.parentElement.textContent.trim();
            radio.parentElement.innerHTML = `
                ${radio.outerHTML}
                <span>${labelText}</span>
            `;
        });
    });
});


document.querySelector('.cta-button').addEventListener('click', function() {
    const formSection = document.getElementById('form-section');
    if (formSection) {
      formSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });

  function nextPage() {
    document.getElementById('page1').classList.remove('active');
    document.getElementById('page2').classList.add('active');
    // Update header text
    document.querySelector('.tlc-form-header-overlap h2').textContent = 'Final Step!';
}

function previousPage() {
    document.getElementById('page2').classList.remove('active');
    document.getElementById('page1').classList.add('active');
    // Reset header text
    document.querySelector('.tlc-form-header-overlap h2').textContent = 'What are you looking for?';
}