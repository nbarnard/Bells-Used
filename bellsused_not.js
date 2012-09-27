//=============================================================================
//  Bells Not Used Chart Plugin v1.0
//  For use with for Musescore v1.2  
//
//  Derived from Mike Magatagan's Count Notes plugin
//
//  Copyright (C)2012 Nicholas Barnard
//  Portions Copyright (C)2011 Mike Magatagan
//
//  This program is free software; you can redistribute it and/or modify
//  it under the terms of the GNU General Public License version 2.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with this program; if not, write to the Free Software
//  Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
//=============================================================================

//  File is name named bellsused_not.js so that this will sort below Bells Used in the Menu

var g_pitch = []; // Pitch array
var g_settings, g_UIMessage, g_UIOptions;

// A blank function, since we don't need to run when MuseScore loads or closes, only when we're called.

function GNDN() {}

// Initializes BellsUsed 

function bellsNotUsed() {
	var loader, file;

	// We need to use typeof here instead of directly checking for undefined as the variable doesn't exist until a score is opened.
	if (typeof curScore === 'undefined') {
		QMessageBox.warning(g_UIMessage, "Warning", "Please Open or Select a Score from which to Create a Bells Not Used Chart.");
		return;
	}

	// Load the form so we can populate it.
	loader = new QUiLoader(null);
	file = new QFile(pluginPath + "/bellsused.ui");
	file.open(QIODevice.OpenMode(QIODevice.ReadOnly, QIODevice.Text));
	g_UIOptions = loader.load(file, null);

	loadPresetUIOptions();

	if (getSetting("bypassDialog", false)) {
		processUIOptions();
	} else {
		displayUIOptions();
	}
}

// Process the Form

function processUIOptions() {
	function userPermissionAdjBellsUsed(){
			var msgBox, buttonPressed;
		msgBox = new QMessageBox;
		msgBox.icon = QMessageBox.Information;
		msgBox.windowTitle = "Bells Used Detected";
		msgBox.informativeText = "The plugin identified the source score as a bells used chart and made adjustments to the bells used as a result.<br /><br />Should these adjustments be kept?";
		msgBox.standardButtons = QMessageBox.Yes | QMessageBox.No;
		msgBox.setDefaultButton(QMessageBox.Yes);

		buttonPressed = msgBox.exec();

		// Check to see if the button pressed is yes (QMessageBox.Yes=16384);
		if (buttonPressed === 16384){
			return true;
		} else {
			return false;
		}

	}
	
	var adjBellsUsed, userPermission;

	// Save the settings if requested.
	if (getSetting("cacheSettings", true)) {
		saveUIOptionsSettings();
	}

	// Gather the Used Pitches
	if(isBellsUsed) {
		// Process as bells used, and see if we made any adjustments.
		adjBellsUsed = populatePitches(true);

		if (adjBellsUsed) {
			userPermission = userPermissionAdjBellsUsed();		
			// Redo the bells used without making adjustments
			if(!userPermission) {
				populatePitches(false);
			}
		}
	} else {
		populatePitches(false);
	}

	if (g_UIOptions.radioScore.checked) {
		scoreBUC();
	}
	if (g_UIOptions.radioText.checked || g_UIOptions.radioCSV.checked) {
		textBUC();
	}
}

// Goes through the whole score Chord by Chord and populates the notes used into Pitch Array.

function populatePitches(sourceIsBellsUsed) {
	// Blank Pitch Object

	function BlankPitch() {
		this.used = false;
		this.enharmonic = [];
	}

	// Beginning of pouplatePitches
	var idx, cursor, staff, voice, i, note, pitch, tone, chord, notesInChord, lastNote, bellsUsedAdjust = false;
	
	// Setup Last note.
	lastNote = new Note();

	// Fill the pitch array with blanks.
	for (idx = 0; idx < 127; idx++) {
		g_pitch[idx] = new BlankPitch();
	}

	cursor = new Cursor(curScore);

	// Loop through Each individual Staff
	for (staff = 0; staff < curScore.staves; ++staff) {
		cursor.staff = staff;

		// Loop through each individual voice
		for (voice = 0; voice < 4; voice++) {
			cursor.voice = voice;
			cursor.rewind(); // set cursor to first chord/rest

			// Make sure we're not at the end of the score.
			while (!cursor.eos()) {
				// We're only going to process this if it is a chord.
				if (cursor.isChord()) {
					// Set us up to cycle through each individual note of the chord.
					chord = cursor.chord();
					notesInChord = chord.notes;
					for (i = 0; i < notesInChord; i++) {
						note = chord.note(i);
						pitch = note.pitch;
						tpc = note.tpc;
						
						// If check to see if the source probably is a BellsUsed Chart and
						// we've had two notes of the same pitch/tpc in a row.
						// If so we've ran into a flat that represents a natural (Re: Issue #6)
						if (sourceIsBellsUsed && lastNote.pitch === pitch && lastNote.tpc === tpc) {
							bellsUsedAdjust = true;
 							// We actually want the next pitch.
 							pitch++;
 							// And give it the primary enharmonic representation.
 							tpc = primaryEnharmonicRep(pitch);
						}						
						
						// Check to see if the pitch is already used, if not add it.
						if (g_pitch[pitch].used) {
							// Check to see if the enharmonic is already listed, if not add it.
							if (!contains(g_pitch[pitch].enharmonic, tpc)) {
								g_pitch[pitch].enharmonic.push(tpc);
							}
						} else {
							g_pitch[pitch].used = true;
							g_pitch[pitch].enharmonic[0] = tpc;
						}
												
						lastNote.pitch=pitch;
						lastNote.tpc=tpc;
					}
				}
				// Move the cursor to the next position.
				cursor.next();
			}
		}
	}

	return bellsUsedAdjust;
}


// Generates Text Based BUCs

function textBUC() {

	// Returns True if the primary representation of this note is an acidental 

	function onlyAccidentalRep(enharmonic) {
		// These are enharmonics that can only be expressed as a sharp or flat
		var OnlyAccidental = [-1, 0, 8, 9, 10, 11, 12, 20, 21, 22, 23, 24, 32, 33];

		return contains(OnlyAccidental, enharmonic);
	}

	// Return the note name

	function noteName(pitch, enharmonic) {
		var notes = ["C", "G", "D", "A", "E", "B", "F"],
			accidental, accsymbols;

		if (g_UIOptions.textOutput.checkUseRealSharpFlat.checked) {
			accsymbols = ["\uD834\uDD2B", "\u266D", "", "\u266F", "\uD834\uDD2A"];
		} else {
			accsymbols = ["bb", "b", "", "#", "##"];
		}

		// find and assign the proper accidental		
		accidental = enharmonic < 6 ? 0 : enharmonic < 13 ? 1 : enharmonic < 20 ? 2 : enharmonic < 27 ? 3 : 4;

		// the enharmonics nicely line up with note names for mod 7
		return (notes[enharmonic % 7] + accsymbols[accidental] + findOctave(pitch));

	}

	// Given a pitch, return what octave it is in.

	function findOctave(pitch) {
		return Math.floor(pitch / 12);
	}

	// Returns the handbell octave associated with the low note (e.g. is this note in a 2, 3, 4, 5, 6, or 7 octave set?

	function highOctaveNumber(pitch) {
		return pitch > 108 ? 8 : pitch > 103 ? 7 : pitch > 96 ? 6 : pitch > 91 ? 5 : pitch > 84 ? 4 : pitch > 79 ? 3 : 2;
	}

	// Returns the handbell octave associated with the low note (e.g. is this note in a 2, 3, 4, 5, 6, or 7 octave set?

	function lowOctaveNumber(pitch) {
		return pitch < 24 ? 8 : pitch < 31 ? 7 : pitch < 36 ? 6 : pitch < 43 ? 5 : pitch < 48 ? 4 : pitch < 55 ? 3 : 2;
	}

	// Start the output. 

	function startOutput() {
		if (!oClipboard) {
			// Open a file selection dialog
			if (oText) {
				fName = QFileDialog.getSaveFileName(g_UIMessage, "Bells Not Used: Save Text Bells Not Used", "", "TXT file (*.txt)", 0);
			} else {
				fName = QFileDialog.getSaveFileName(g_UIMessage, "Bells Not Used: Save CSV Bells Not Used", "", "CSV file (*.csv)", 0);
			}

			if (fName === null || fName === "") {
				return false;
			}
			// Open data file as a text stream
			file = new QFile(fName);
			if (file.exists()) {
				file.remove();
			}
			if (!file.open(QIODevice.ReadWrite)) {
				QMessageBox.critical(g_UIMessage, "File Error", "Could not create output file " + fName);
				return false;
			}
			textStream = new QTextStream(file);
		} else {
			// Initialize clipboard buffer with a blank.
			clipboardBuf = "";
		}
		return true;
	}

	// Add to our output

	function writeOutput(buf) {
		if (!oClipboard) {
			textStream.writeString(buf);
		} else {
			clipboardBuf = clipboardBuf + buf;
		}
	}

	// Close our output.

	function endOutput() {
		if (!oClipboard) {
			file.close();
		} else {
			QApplication.clipboard().setText(clipboardBuf, 0);
			QMessageBox.information(g_UIMessage, "Complete", "Bells Not Used on Clipboard");
		}
		return;
	}

	// Start of textBUC function

	var idx, fName, file, textStream, octave, x, minPitch, maxPitch, title, composer, clipboardBuf, oClipboard, oText, startTone, endTone, lowOctaveNum, highOctaveNum, maxOctave = 0,
		numBellsUsed = 0;

	oClipboard = g_UIOptions.textOutput.checkClipboard.checked;
	oText = g_UIOptions.radioText.checked;

	// Set up some details for later
	title = cleanCurScoreTitle();
	composer = curScore.composer;

	if (!startOutput()) {
		return;
	}

	minPitch = findLowPitch();
	maxPitch = findHighPitch();

	startTone = lowOctaveBegin(minPitch);
	endTone = highOctaveEnd(maxPitch);

	lowOctaveNum = lowOctaveNumber(minPitch);
	highOctaveNum = highOctaveNumber(maxPitch);

	// Write out the header for the piece. If we have the title and the composer output both. 
	// If we have just the title output it. If we have neither. don't output any of it.
	// MuseScore returns an empty string instead of undefined, so we test for that.
	if (oText) {
		writeOutput("Bells Not Used");
		if (title !== "") {
			writeOutput(" in \"" + title + "\"");
			if (composer !== "") {
				writeOutput(" By: " + composer);
			}
		}
		writeOutput(":\r\n");
	} else {
		if (g_UIOptions.checkCSVHeader.checked) {
			// Write out all the header including all the notes in order
			writeOutput("Title,Composer,Low Octave,High Octave,Octaves Used,");

			for (x = 0; x < 127; x++) {
				writeOutput(noteName(x, primaryEnharmonicRep(x)) + ",");
			}
			writeOutput("\r\n");
		}
		if (title !== "") {
			writeOutput(title + ",");
			if (composer !== "") {
				writeOutput(composer + ",");
			} else {
				writeOutput(",");
			}
		} else {
			writeOutput(",,");
		}

		writeOutput(lowOctaveNum + "," + highOctaveNum + ",");
		writeOutput(((findOctave(maxPitch) - findOctave(minPitch)) + 1) + ",");
	}

	// Iterate through all the notes from the bottom to the top printing out the ones that are used.
	for (idx = startTone; idx < endTone; idx++) {
		// Check if note is process the note  as used/unused
		if (!g_pitch[idx].used) {
			// Find the proper octave
			octave = findOctave(idx);
			// update the number of Bells Not Used
			numBellsUsed++;

			// If we're starting a new octave put an extra line feed for text output in and set the highest octave
			if ((oText) && (octave > maxOctave)) {
				maxOctave = octave;
				writeOutput("\r\n");
			}


			writeOutput(noteName(idx, primaryEnharmonicRep(idx)));

			// if its text output a linefeed, if CSV output output a comma.
			if (oText) {
				writeOutput("\r\n");
			} else {
				writeOutput(",");
			}
		} else {
			// Print an empty cell for CSV
			if (!oText) {
				writeOutput(",");
			}
		}
	}

	if (oText) {
		if (lowOctaveNum === highOctaveNum) {
			// *** Nice things will be written about pieces that are symmetrical octave wise.
			//writeOutput("\r\n" + (findOctave(maxPitch) - findOctave(minPitch)) + " octaves with " + numBellsUsed + " Bells Not Used ranging from " + noteName(minPitch, g_pitch[minPitch].enharmonic[0]) + " to " + noteName(maxPitch, g_pitch[maxPitch].enharmonic[0]) + " with " + numAccidentalsUsed + " accidentals.\r\n");
		} else {
			// *** Dirty things will be written about pieces that aren't symmetrical octave wise.
		}
	}
	endOutput();
}

// Generates Score BUC

function scoreBUC() {
	var processPitch = function(pitch) {

		// if the pitch isn't used do nothing.
		if (g_pitch[pitch].used) {
			return;
		}

		// Add the pitch to the Chord.
		note = new Note();
		note.pitch = pitch;
		note.tpc = primaryEnharmonicRep(pitch);


		addNote(note);

		lastNote.pitch = pitch;
		lastNote.tpc = note.tpc;

		cursor.next();

		return;
	};

	function addNote(note) {
		chord = new Chord();
		chord.tickLen = 480;

		chord.addNote(note);
		cursor.add(chord);

		chord = cursor.chord();
		chord.noStem = true;
	}

	function addEndNotes() {
		var x, note, len;

		if (bassLen === 0) {
			lastNote.pitch = 48;
			lastNote.tpc = 14;
		}

		if (trebleLen === 0) {
			lastNote.pitch = 72;
			lastNote.tpc = 14;
		}

		notesNeeded = Math.abs(bassLen - trebleLen);

		// We're adding quarter notes because MuseScore doesn't like really long notes, and it does weird things.
		// Also we're creating a new note object each time, because MuseScore does funky things if we reuse the same note object.
		for (x = 0; x !== notesNeeded; x++) {
			note = new Note();
			note.pitch = lastNote.pitch;
			note.tpc = lastNote.tpc;
			note.visible = false;

			addNote(note);
			cursor.next();
		}
	}

	// Walks the Treble clef and passes our current position to function fnc.

	function walkTreble(fnc) {
		var x;

		for (x = clefSplit + 1; x <= endTone; x++) {
			fnc(x);
		}
	}

	// Walks the Bass clef and passes our current position to function fnc.

	function walkBass(fnc) {
		var x;

		for (x = startTone; x <= clefSplit; x++) {
			fnc(x);
		}
	}

	var notesNotInRange = function(x) {
		if (!g_pitch[x].used) {
			usedPitches++;
		}
	};

	function notesNotInTreble() {
		usedPitches = 0;

		walkTreble(notesNotInRange);

		return usedPitches;
	}

	function notesNotInBass() {
		usedPitches = 0;

		walkBass(notesNotInRange);

		return usedPitches;
	}

	// Beginning of scoreBUC
	var title, composer, measureLen, idx, score, cursor, lastNote, bassLen, trebleLen, chord, note, usedPitches, startTone, endTone, clefSplit;

	// The tone where the split between the treble and the bass clef is. Any Flat TPCs will go in the treble, naturals and sharps in the bass
	clefSplit = 61;

	// Set up some details for later
	title = cleanCurScoreTitle();
	composer = curScore.composer;

	startTone = lowOctaveBegin(findLowPitch());
	endTone = highOctaveEnd(findHighPitch());

	// Find the number of notes not in each clef
	bassLen = notesNotInBass();
	trebleLen = notesNotInTreble();

	// Assign measure length to the larger between the notes in the Bass or treble clef.
	measureLen = Math.max(bassLen, trebleLen);

	// The last note written is a Note object. MuseScore sets lastNote.pitch = 0 here.
	lastNote = new Note();

	// Create the Score	
	score = new Score();

	score.title = title + " - Bells Not Used";
	score.composer = composer;
	// *** subtitle will carry the octaves used/not used.

	// Make a measure of the appropriate length, so there are no barlines in the BUC.
	score.timesig = new TimeSig(measureLen, 4);
	// Be explicit: we want C Major/A Minor (0 flats/sharps) in key sig.
	score.keysig = 0;

	// create two staff piano part, or the "Blank" instrument for BUCs
	if (getSetting("UseBlankInstrument", false)) {
		score.appendPart("\u2060");
	} else {
		score.appendPart("Piano");
	}

	// If Musescore doesn't recognize the instrument, it'll put a default instrument with only one staff.
	if (score.staves !== 2) {
		QMessageBox.critical(g_UIMessage, "Instrument Not Installed", "The Blank Name Instrument is not installed, although the option for the using the Blank Name Instrument is selected. <br /><br />This option has been disabled. Please try to create your Bells Not Used Chart again.");

		g_settings.setValue("UseBlankInstrument", false);
		g_settings.sync();

		score.close();
		return false;
	}

	score.appendMeasures(1);
	cursor = new Cursor(score);

	// Bass Clef
	cursor.staff = 1;
	cursor.voice = 0;
	cursor.rewind();

	walkBass(processPitch);

	// If we have fewer bass notes than treble notes add a hidden padding note.
	if (bassLen < trebleLen) {
		addEndNotes();
	}


	// Treble Clef
	cursor.staff = 0;
	cursor.voice = 0;
	cursor.rewind();

	walkTreble(processPitch);

	// If we have fewer treble notes than bass notes add a hidden padding note.
	if (trebleLen < bassLen) {
		addEndNotes();
	}

	// by ending the "undo" MuseScore will display the score.
	score.endUndo();

	return;
}

// Returns the ending of the octave on the high side. We're using handbell octaves so we break on Cs and Gs.

function highOctaveEnd(pitch) {
	return pitch > 103 ? 108 : pitch > 96 ? 103 : pitch > 91 ? 96 : pitch > 84 ? 91 : pitch > 79 ? 84 : 79;
}

// Returns the beginning of the octave on the low side. We're using handbell octaves so we break on Cs and Gs.

function lowOctaveBegin(pitch) {
	return pitch < 24 ? 17 : pitch < 31 ? 24 : pitch < 36 ? 31 : pitch < 43 ? 36 : pitch < 48 ? 43 : pitch < 55 ? 48 : 55;
}

// Return the highest pitch.

function findHighPitch() {
	var x;
	for (x = 126; !g_pitch[x].used; x--) {}

	// Wherever the for loop stopped is the end.
	return x;
}

// Return the lowest pitch.

function findLowPitch() {
	var x;
	for (x = 0; !g_pitch[x].used; x++) {}

	// Wherever the for loop stopped is the end.
	return x;
}

// Cleans the current Score title of " - Bells Used"
function cleanCurScoreTitle() {
	var titleLength;
	
	if (isBellsUsed()) { 
		titleLength = curScore.title.length;
		return curScore.title.substring(0, titleLength - 13);
	} else {
		return curScore.title;
	}
}

// Returns True/False if the current score title contains "Bells Used"
function isBellsUsed(){
	var titleLength;
	
	titleLength = curScore.title.length;
	
	if (titleLength < 13) {
		return false;
	}
	
	if (curScore.title.substring(titleLength - 13) === " - Bells Used") {
		return true;
	} else { 
		return false;
	}
}

// Returns the primary enharmonic given a pitch. 
// Primary Enharmonic is the Natural or Sharp representation of a note

function primaryEnharmonicRep(pitch) {
	// This the order of enharmonics e.g. 14=C, 21=C#, etc.
	var EnharmonicOrder = [14, 21, 16, 23, 18, 13, 20, 15, 22, 17, 24, 19];

	return EnharmonicOrder[pitch % 12];
}

// Display Dialog

function displayUIOptions() {
	// connect signals
	g_UIOptions.buttonBox.accepted.connect(processUIOptions);
	g_UIOptions.radioScore.toggled.connect(changedRadio);
	g_UIOptions.radioText.toggled.connect(changedRadio);
	g_UIOptions.radioCSV.toggled.connect(changedRadio);

	// Call Changed Radio to Set visible items properly.
	changedRadio();

	g_UIOptions.show();
}

// Loads settings into UI

function loadPresetUIOptions() {
	// Get Settings and populate the form
	g_settings = new QSettings(QSettings.NativeFormat, QSettings.UserScope, "MusE", "pluginBellsUsed", null);

	g_UIOptions.radioScore.checked = getSetting("Score", true);
	g_UIOptions.radioText.checked = getSetting("Text", false);
	g_UIOptions.radioCSV.checked = getSetting("CSV", false);
	g_UIOptions.textOutput.checkClipboard.checked = getSetting("Clipboard", false);
	g_UIOptions.textOutput.checkUseRealSharpFlat.checked = getSetting("UseRealSharpFlat", true);
	g_UIOptions.checkCSVHeader.checked = getSetting("CSVHeader", true);
}

function saveUIOptionsSettings() {
	g_settings.setValue("Score", g_UIOptions.radioScore.checked);
	g_settings.setValue("Text", g_UIOptions.radioText.checked);
	g_settings.setValue("CSV", g_UIOptions.radioCSV.checked);
	g_settings.setValue("Clipboard", g_UIOptions.textOutput.checkClipboard.checked);
	g_settings.setValue("UseRealSharpFlat", g_UIOptions.textOutput.checkUseRealSharpFlat.checked);
	g_settings.setValue("CSVHeader", g_UIOptions.checkCSVHeader.checked);

	// Save to disk
	g_settings.sync();
}

// Adjust the visible elements on the form per the current checked radio button.

function changedRadio() {
	if (g_UIOptions.radioText.checked) {
		g_UIOptions.textOutput.enabled = true;
		g_UIOptions.checkCSVHeader.visible = false;
		return;
	}
	if (g_UIOptions.radioCSV.checked) {
		g_UIOptions.textOutput.enabled = true;
		g_UIOptions.checkCSVHeader.visible = true;
		return;
	}

	// No radio is selected, or radioScore is selected.
	g_UIOptions.textOutput.enabled = false;
	g_UIOptions.checkCSVHeader.visible = false;
	return;

}

// Were passing through this because QT on Windows stores true/false as strings. sigh.

function getSetting(key, fallback) {
	var temp;

	temp = g_settings.value(key, fallback);

	if (typeof temp !== 'string') {
		return temp;
	}

	if (temp === 'true') {
		return true;
	} else {
		return false;
	}

}

// See if an array contains an object from http://stackoverflow.com/questions/237104/array-containsobj-in-javascript

function contains(a, obj) {
	var i;
	for (i = 0; i < a.length; i++) {
		if (a[i] === obj) {
			return true;
		}
	}
	return false;
}

// Defines how MuseScore interacts with this plugin
var bellsNotUsed = {
	majorVersion: 1,
	minorVersion: 1,
	menu: 'Plugins.Bells Used.Generate Bells Not Used Chart',
	init: GNDN,
	run: bellsNotUsed
};

bellsNotUsed;