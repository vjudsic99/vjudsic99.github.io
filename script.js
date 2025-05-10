document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const cameraButton = document.getElementById('cameraButton');
    const imageInput = document.getElementById('imageInput');
    const uploadButton = document.getElementById('uploadButton');
    const uploadInput = document.getElementById('uploadInput');
    const previewSection = document.getElementById('previewSection');
    const loadingSection = document.getElementById('loadingSection');
    const solutionSection = document.getElementById('solutionSection');
    const errorSection = document.getElementById('errorSection');
    const previewImage = document.getElementById('previewImage');
    const cancelButton = document.getElementById('cancelButton');
    const solveButton = document.getElementById('solveButton');
    const newProblemButton = document.getElementById('newProblemButton');
    const tryAgainButton = document.getElementById('tryAgainButton');
    const solutionContainer = document.getElementById('solutionContainer');
    const errorMessage = document.getElementById('errorMessage');
    const problemsList = document.getElementById('problemsList');
    const englishBtn = document.getElementById('englishBtn');
    const bosnianBtn = document.getElementById('bosnianBtn');

    // Language translations
    const translations = {
        english: {
            title: "PhysicsSolver AI",
            takePhoto: "Take Photo",
            or: "or",
            uploadImage: "Upload Image",
            yourProblem: "Your Physics Problem",
            cancel: "Cancel",
            solveProblem: "Solve Problem",
            analyzing: "Analyzing physics problem...",
            solution: "Solution",
            solveAnother: "Solve Another Problem",
            errorMessage: "Sorry, I couldn't analyze this image. Please try a clearer image or a different physics problem.",
            tryAgain: "Try Again",
            recentProblems: "Recent Problems",
            emptyState: "Your recent problems will appear here",
            footerText: "PhysicsSolver AI - Solving physics problems with AI"
        },
        bosnian: {
            title: "Fizika Rješavač AI",
            takePhoto: "Uslikaj",
            or: "ili",
            uploadImage: "Učitaj sliku",
            yourProblem: "Vaš zadatak iz fizike",
            cancel: "Otkaži",
            solveProblem: "Riješi zadatak",
            analyzing: "Analiziram zadatak iz fizike...",
            solution: "Rješenje",
            solveAnother: "Riješi drugi zadatak",
            errorMessage: "Žao mi je, ne mogu analizirati ovu sliku. Molimo pokušajte s jasnijom slikom ili drugim zadatkom iz fizike.",
            tryAgain: "Pokušaj ponovo",
            recentProblems: "Nedavni zadaci",
            emptyState: "Vaši nedavni zadaci će se pojaviti ovdje",
            footerText: "Fizika Rješavač AI - Rješavanje zadataka iz fizike pomoću AI"
        }
    };

    // Current language
    let currentLanguage = 'english';

    // Initialize WebsimSocket for persistent storage
    const room = new WebsimSocket();

    // Initialize language
    applyLanguage();

    // Event listeners
    cameraButton.addEventListener('click', () => {
        imageInput.click();
    });

    uploadButton.addEventListener('click', () => {
        uploadInput.click();
    });

    imageInput.addEventListener('change', handleImageSelection);
    uploadInput.addEventListener('change', handleImageSelection);

    cancelButton.addEventListener('click', resetUI);

    solveButton.addEventListener('click', () => {
        analyzePhysicsProblem();
    });

    newProblemButton.addEventListener('click', resetUI);

    tryAgainButton.addEventListener('click', resetUI);

    // Language selection
    englishBtn.addEventListener('click', () => {
        currentLanguage = 'english';
        englishBtn.classList.add('active');
        bosnianBtn.classList.remove('active');
        applyLanguage();
    });

    bosnianBtn.addEventListener('click', () => {
        currentLanguage = 'bosnian';
        bosnianBtn.classList.add('active');
        englishBtn.classList.remove('active');
        applyLanguage();
    });

    // Load recent problems on page load
    loadRecentProblems();

    // Functions
    function handleImageSelection(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.match('image.*')) {
            showError('Please select an image file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            showSection(previewSection);
        };
        reader.readAsDataURL(file);
    }

    async function analyzePhysicsProblem() {
        showSection(loadingSection);

        try {
            // Upload the image to get a URL
            const blob = await fetch(previewImage.src).then(r => r.blob());
            const file = new File([blob], "physics_problem.jpg", { type: "image/jpeg" });
            const imageUrl = await uploadImage(file);

            // Use AI to solve the physics problem
            const solution = await solveWithAI(imageUrl);

            if (solution.error) {
                showError(solution.error);
                return;
            }

            // Display the solution
            renderSolution(solution);
            showSection(solutionSection);

            // Save to recent problems
            saveRecentProblem(imageUrl, solution);

            // Update the recent problems list
            loadRecentProblems();

        } catch (error) {
            console.error('Error analyzing physics problem:', error);
            showError('An error occurred while analyzing the physics problem. Please try again.');
        }
    }

    async function uploadImage(file) {
        try {
            // Upload to S3 via the websim API
            const url = await websim.upload(file);
            return url;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    async function solveWithAI(imageUrl) {
        try {
            // Use the LLM to analyze and solve the physics problem
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are a physics tutor AI that solves physics problems from images. 
                        Analyze the physics problem in the image and provide a step-by-step solution.
                        Identify the type of physics problem (mechanics, thermodynamics, electromagnetism, etc.).
                        Apply relevant formulas and explain each step clearly.
                        Include calculations and final answers.
                        Format your response with step numbers, equations, and explanations.
                        If you can't clearly see or understand the problem, explain what's unclear.
                        ${currentLanguage === 'bosnian' ? 'Please provide your response in Bosnian language.' : ''}`
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Please solve this physics problem. Provide a step-by-step solution.",
                            },
                            {
                                type: "image_url",
                                image_url: { url: imageUrl },
                            },
                        ],
                    },
                ],
            });

            // Process the AI response
            return {
                steps: parseSteps(completion.content),
                fullText: completion.content
            };
        } catch (error) {
            console.error('Error solving with AI:', error);
            return { error: 'Failed to solve the problem. Please try a clearer image.' };
        }
    }

    function parseSteps(solutionText) {
        // Simple step parser - splits by numbered steps or line breaks
        // In a real app, this would be more sophisticated
        const steps = [];

        // Try to identify numbered steps like "1. " or "Step 1: "
        const stepMatches = solutionText.match(/(?:^|\n)(?:Step\s*)?(\d+)[.:]+(.*?)(?=(?:\n(?:Step\s*)?(?:\d+)[.:]+|\n*$))/gs);

        if (stepMatches && stepMatches.length > 0) {
            return stepMatches.map(step => {
                // Clean up the step text
                return step.trim().replace(/^Step\s*\d+[.:]+/, '');
            });
        }

        // Fallback: just split by double newlines
        return solutionText.split(/\n\n+/).filter(s => s.trim().length > 0);
    }

    function renderSolution(solution) {
        if (solution.steps && solution.steps.length > 0) {
            // Render structured steps
            solutionContainer.innerHTML = solution.steps.map((step, index) => {
                return `
                    <div class="step">
                        <span class="step-number">Step ${index + 1}:</span>
                        ${formatStep(step)}
                    </div>
                `;
            }).join('');
        } else {
            // Fallback to raw text with basic formatting
            solutionContainer.innerHTML = formatText(solution.fullText);
        }
    }

    function formatStep(stepText) {
        // Format equations and special physics notations
        return stepText
            .replace(/\$([^$]+)\$/g, '<span class="equation">$1</span>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    }

    function formatText(text) {
        // Basic Markdown-ish formatting
        return text
            .replace(/\n\n/g, '<br/><br/>')
            .replace(/\n/g, '<br/>')
            .replace(/\$([^$]+)\$/g, '<span class="equation">$1</span>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    }

    async function saveRecentProblem(imageUrl, solution) {
        try {
            // Save to persistent storage
            await room.collection('physics_problems').create({
                imageUrl,
                solution: solution.fullText,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error saving recent problem:', error);
        }
    }

    async function loadRecentProblems() {
        try {
            // Get problems from persistent storage, most recent first
            const problems = await room.collection('physics_problems').getList();

            if (problems.length === 0) {
                problemsList.innerHTML = '<p class="empty-state">Your recent problems will appear here</p>';
                return;
            }

            // Display the problems
            problemsList.innerHTML = problems.slice(0, 6).map(problem => {
                return `
                    <div class="problem-item" data-id="${problem.id}">
                        <img src="${problem.imageUrl}" alt="Physics problem">
                    </div>
                `;
            }).join('');

            // Add click event to view solutions
            document.querySelectorAll('.problem-item').forEach(item => {
                item.addEventListener('click', () => {
                    const problemId = item.getAttribute('data-id');
                    viewProblemSolution(problemId);
                });
            });

        } catch (error) {
            console.error('Error loading recent problems:', error);
            problemsList.innerHTML = '<p class="empty-state">Error loading recent problems</p>';
        }
    }

    async function viewProblemSolution(problemId) {
        try {
            // Find the problem in storage
            const problems = await room.collection('physics_problems').getList();
            const problem = problems.find(p => p.id === problemId);

            if (!problem) {
                showError('Problem not found');
                return;
            }

            // Display the problem image and solution
            previewImage.src = problem.imageUrl;
            renderSolution({ fullText: problem.solution });

            // Show the relevant sections
            showSection(previewSection);
            showSection(solutionSection);

        } catch (error) {
            console.error('Error viewing problem solution:', error);
            showError('Error loading the selected problem');
        }
    }

    function showSection(section) {
        // Hide all sections
        previewSection.style.display = 'none';
        loadingSection.style.display = 'none';
        solutionSection.style.display = 'none';
        errorSection.style.display = 'none';

        // Show the requested section
        section.style.display = 'block';

        // Scroll to the section
        section.scrollIntoView({ behavior: 'smooth' });
    }

    function showError(message) {
        errorMessage.textContent = message;
        showSection(errorSection);
    }

    function resetUI() {
        // Reset inputs
        imageInput.value = '';
        uploadInput.value = '';

        // Show the initial upload section only
        previewSection.style.display = 'none';
        loadingSection.style.display = 'none';
        solutionSection.style.display = 'none';
        errorSection.style.display = 'none';

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function applyLanguage() {
        const lang = translations[currentLanguage];

        // Update UI elements with translated text
        document.querySelector('h1').textContent = lang.title;
        document.querySelector('#cameraButton span').textContent = lang.takePhoto;
        document.querySelector('.or-divider').textContent = lang.or;
        document.querySelector('#uploadButton span').textContent = lang.uploadImage;
        document.querySelector('.preview-section h2').textContent = lang.yourProblem;
        document.querySelector('#cancelButton').textContent = lang.cancel;
        document.querySelector('#solveButton').textContent = lang.solveProblem;
        document.querySelector('.loading-section p').textContent = lang.analyzing;
        document.querySelector('.solution-section h2').textContent = lang.solution;
        document.querySelector('#newProblemButton').textContent = lang.solveAnother;
        document.querySelector('#errorMessage').textContent = lang.errorMessage;
        document.querySelector('#tryAgainButton').textContent = lang.tryAgain;
        document.querySelector('.recent-problems h2').textContent = lang.recentProblems;
        document.querySelector('.empty-state').textContent = lang.emptyState;
        document.querySelector('#footerText').textContent = lang.footerText;
    }
});
