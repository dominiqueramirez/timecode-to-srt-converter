/**
 * Timecode to SRT Converter
 * Developed by Dominique Ramirez
 * 
 * Converts transcripts with HH;MM;SS;FF timecodes to standard SRT subtitle format
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const frameRate = document.getElementById('frameRate');
    const convertBtn = document.getElementById('convertBtn');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const clearBtn = document.getElementById('clearBtn');
    const dropZone = document.getElementById('dropZone');
    const browseBtn = document.getElementById('browseBtn');
    const fileInput = document.getElementById('fileInput');
    const statusMessage = document.getElementById('statusMessage');

    // Event Listeners
    convertBtn.addEventListener('click', convertToSRT);
    copyBtn.addEventListener('click', copyToClipboard);
    downloadBtn.addEventListener('click', downloadSRT);
    clearBtn.addEventListener('click', clearAll);
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and Drop Events
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    dropZone.addEventListener('click', (e) => {
        if (e.target !== browseBtn) {
            fileInput.click();
        }
    });

    /**
     * Converts frames to milliseconds based on the selected frame rate
     * @param {number} frames - Frame number
     * @param {number} fps - Frames per second
     * @returns {number} Milliseconds
     */
    function framesToMilliseconds(frames, fps) {
        return Math.round((frames / fps) * 1000);
    }

    /**
     * Converts timecode from HH;MM;SS;FF format to HH:MM:SS,mmm format
     * @param {string} timecode - Timecode in HH;MM;SS;FF format
     * @param {number} fps - Frames per second
     * @returns {string} Timecode in SRT format (HH:MM:SS,mmm)
     */
    function convertTimecode(timecode, fps) {
        // Handle both semicolon and colon separators
        const parts = timecode.split(/[;:]/);
        
        if (parts.length !== 4) {
            throw new Error(`Invalid timecode format: ${timecode}`);
        }

        const hours = parts[0].padStart(2, '0');
        const minutes = parts[1].padStart(2, '0');
        const seconds = parts[2].padStart(2, '0');
        const frames = parseInt(parts[3], 10);
        
        const milliseconds = framesToMilliseconds(frames, fps);
        const msString = milliseconds.toString().padStart(3, '0');

        return `${hours}:${minutes}:${seconds},${msString}`;
    }

    /**
     * Parses the input transcript and converts it to SRT format
     * @param {string} input - Raw transcript text
     * @param {number} fps - Frames per second
     * @returns {string} SRT formatted text
     */
    function parseAndConvert(input, fps) {
        // Regular expression to match timecode patterns
        // Matches: HH;MM;SS;FF - HH;MM;SS;FF or HH:MM:SS:FF - HH:MM:SS:FF
        const timecodePattern = /(\d{1,2}[;:]\d{1,2}[;:]\d{1,2}[;:]\d{1,2})\s*[-–—]\s*(\d{1,2}[;:]\d{1,2}[;:]\d{1,2}[;:]\d{1,2})/;
        
        const lines = input.trim().split('\n');
        const subtitles = [];
        let currentSubtitle = null;
        let subtitleText = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (!line) {
                // Empty line - if we have a current subtitle, save it
                if (currentSubtitle && subtitleText.length > 0) {
                    currentSubtitle.text = subtitleText.join('\n');
                    subtitles.push(currentSubtitle);
                    currentSubtitle = null;
                    subtitleText = [];
                }
                continue;
            }

            const match = line.match(timecodePattern);
            
            if (match) {
                // Save previous subtitle if exists
                if (currentSubtitle && subtitleText.length > 0) {
                    currentSubtitle.text = subtitleText.join('\n');
                    subtitles.push(currentSubtitle);
                    subtitleText = [];
                }

                // Start new subtitle
                try {
                    currentSubtitle = {
                        startTime: convertTimecode(match[1], fps),
                        endTime: convertTimecode(match[2], fps)
                    };
                } catch (error) {
                    throw new Error(`Error parsing timecode on line ${i + 1}: ${error.message}`);
                }

                // Check if there's text after the timecode on the same line
                const afterTimecode = line.substring(line.indexOf(match[2]) + match[2].length).trim();
                if (afterTimecode) {
                    subtitleText.push(afterTimecode);
                }
            } else if (currentSubtitle) {
                // This is subtitle text
                subtitleText.push(line);
            }
        }

        // Don't forget the last subtitle
        if (currentSubtitle && subtitleText.length > 0) {
            currentSubtitle.text = subtitleText.join('\n');
            subtitles.push(currentSubtitle);
        }

        if (subtitles.length === 0) {
            throw new Error('No valid timecodes found in the input. Please check the format.');
        }

        // Generate SRT output
        let srtOutput = '';
        subtitles.forEach((subtitle, index) => {
            srtOutput += `${index + 1}\n`;
            srtOutput += `${subtitle.startTime} --> ${subtitle.endTime}\n`;
            srtOutput += `${subtitle.text}\n`;
            srtOutput += '\n';
        });

        return srtOutput.trim();
    }

    /**
     * Main conversion function
     */
    function convertToSRT() {
        const input = inputText.value.trim();
        
        if (!input) {
            showStatus('Please enter or upload a transcript to convert.', 'error');
            return;
        }

        const fps = parseFloat(frameRate.value);

        try {
            const srtOutput = parseAndConvert(input, fps);
            outputText.value = srtOutput;
            showStatus(`Successfully converted! Found ${srtOutput.split('\n\n').length} subtitle entries.`, 'success');
        } catch (error) {
            showStatus(error.message, 'error');
            outputText.value = '';
        }
    }

    /**
     * Copies the SRT output to clipboard
     */
    async function copyToClipboard() {
        const output = outputText.value.trim();
        
        if (!output) {
            showStatus('Nothing to copy. Please convert a transcript first.', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(output);
            showStatus('SRT content copied to clipboard!', 'success');
        } catch (error) {
            // Fallback for older browsers
            outputText.select();
            document.execCommand('copy');
            showStatus('SRT content copied to clipboard!', 'success');
        }
    }

    /**
     * Downloads the SRT file
     */
    function downloadSRT() {
        const output = outputText.value.trim();
        
        if (!output) {
            showStatus('Nothing to download. Please convert a transcript first.', 'error');
            return;
        }

        const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `subtitles_${timestamp}.srt`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showStatus('SRT file downloaded successfully!', 'success');
    }

    /**
     * Clears all input and output
     */
    function clearAll() {
        inputText.value = '';
        outputText.value = '';
        fileInput.value = '';
        hideStatus();
        showStatus('All fields cleared.', 'info');
        setTimeout(hideStatus, 2000);
    }

    /**
     * Handles file selection via browse button
     * @param {Event} event - Change event
     */
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            readFile(file);
        }
    }

    /**
     * Handles drag over event
     * @param {DragEvent} event - Drag event
     */
    function handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        dropZone.classList.add('drag-over');
    }

    /**
     * Handles drag leave event
     * @param {DragEvent} event - Drag event
     */
    function handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        dropZone.classList.remove('drag-over');
    }

    /**
     * Handles drop event
     * @param {DragEvent} event - Drop event
     */
    function handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        dropZone.classList.remove('drag-over');

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            
            // Check if it's a .txt file
            if (!file.name.toLowerCase().endsWith('.txt')) {
                showStatus('Please upload a .txt file only.', 'error');
                return;
            }
            
            readFile(file);
        }
    }

    /**
     * Reads the content of a file
     * @param {File} file - File to read
     */
    function readFile(file) {
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.txt')) {
            showStatus('Please upload a .txt file only.', 'error');
            return;
        }

        const reader = new FileReader();
        
        reader.onload = function(e) {
            inputText.value = e.target.result;
            showStatus(`File "${file.name}" loaded successfully!`, 'success');
        };

        reader.onerror = function() {
            showStatus('Error reading file. Please try again.', 'error');
        };

        reader.readAsText(file);
    }

    /**
     * Shows a status message
     * @param {string} message - Message to display
     * @param {string} type - Message type (success, error, info)
     */
    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message ' + type;
    }

    /**
     * Hides the status message
     */
    function hideStatus() {
        statusMessage.className = 'status-message';
        statusMessage.textContent = '';
    }
});
