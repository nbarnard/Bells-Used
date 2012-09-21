//=============================================================================
//  Bells Used Chart Plugin v1.0
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

var g_pitch = []; // Pitch array
var g_settings, g_UIMessage, g_UIOptions;

// A blank function, since we don't need to run when MuseScore loads or closes, only when we're called.

function GNDN() {}

// Initializes BellsUsed 

function bellsUsed() {
	var loader, file;

	// We need to use typeof here instead of directly checking for undefined as the variable doesn't exist until a score is opened.
	if (typeof curScore === 'undefined') {
		QMessageBox.warning(g_UIMessage, "Warning", "Please Open or Select a Score from which to Create a Bells Used Chart.");
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
	// Save the settings if requested.
	if (getSetting("cacheSettings", true)) {
		saveUIOptionsSettings();
	}

	// Gather the Used Pitches
	populatePitches();

	if (g_UIOptions.radioScore.checked) {
		scoreBUC();
	}
	if (g_UIOptions.radioText.checked || g_UIOptions.radioCSV.checked) {
		textBUC();
	}
}

// Goes through the whole score Chord by Chord and populates the notes used into Pitch Array.

function populatePitches() {
	// Blank Pitch Object

	function BlankPitch() {
		this.used = false;
		this.enharmonic = [];
	}

	// Beginning of pouplatePitches
	var idx, cursor, staff, voice, i, note, pitch, tone, chord, n;

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
					n = chord.notes;
					for (i = 0; i < n; i++) {
						note = chord.note(i);
						pitch = note.pitch;
						tone = note.tpc;

						// Check to see if the pitch is already used, if not add it.
						if (g_pitch[pitch].used) {
							// Check to see if the enharmonic is already listed, if not add it.
							if (!contains(g_pitch[pitch].enharmonic, tone)) {
								g_pitch[pitch].enharmonic.push(tone);
							}
						} else {
							g_pitch[pitch].used = true;
							g_pitch[pitch].enharmonic[0] = tone;
						}
					}
				}
				// Move the cursor to the next position.
				cursor.next();
			}
		}
	}
}

// Generates Text Based BUCs

function textBUC() {
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

	// Returns True if the primary representation of this note is an acidental 

	function onlyAccidentalRep(enharmonic) {
		// These are enharmonics that can only be expressed as a sharp or flat
		var OnlyAccidental = [-1, 0, 8, 9, 10, 11, 12, 20, 21, 22, 23, 24, 32, 33];

		return contains(OnlyAccidental, enharmonic);
	}

	// Returns the primary enharmonic given a pitch. 
	// Primary Enharmonic is the Natural or Sharp representation of a note

	function primaryEnharmonicRep(pitch) {
		// This the order of enharmonics e.g. 14=C, 21=C#, etc.
		var EnharmonicOrder = [14, 21, 16, 23, 18, 13, 20, 15, 22, 17, 24, 19];

		return EnharmonicOrder[pitch % 12];
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

	// Find the proper octave and return it. 

	function findOctave(pitch) {
		return Math.floor(pitch / 12);
	}

	// Sorts enharmonics from most preferred to least preferred.
	// We prefer a natural to any accidental, and a single accidental to a double accidental.

	function sortenharmonics(a, b) {
		// Primary representation of notes are between 13 and 24. If a or b is in that range it should be first.
		if ((a >= 13) && (a <= 24)) {
			return -1;
		}

		if ((b >= 13) && (b <= 24)) {
			return 1;
		}

		// Tertiary notes are <=5 or >=30 they should be last. If a or b is in that range it should be last.
		if ((a <= 5) || (a >= 30)) {
			return 1;
		}

		if ((b <= 5) || (b >= 30)) {
			return -1;
		}

		// Although in practice we shouldn't get two values that could be considered equal, just in case we somehow did.
		return 0;
	}

	// Start the output. 

	function startOutput() {
		if (!oClipboard) {
			// Open a file selection dialog
			if (oText) {
				fName = QFileDialog.getSaveFileName(g_UIMessage, "Bells Used: Save Text Bells Used", "", "TXT file (*.txt)", 0);
			} else {
				fName = QFileDialog.getSaveFileName(g_UIMessage, "Bells Used: Save CSV Bells Used", "", "CSV file (*.csv)", 0);
			}

			if (fName === null || fName === "") {
				return false;
			}
			// Open data file as a text stream
			//
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
			QMessageBox.information(g_UIMessage, "Complete", "Bells Used on Clipboard");
		}
		return;
	}

	// Start of textBUC function

	var idx, fName, file, textStream, octave, x, minPitch, maxPitch, maxOctave = 0,
		NumBellsUsed = 0,
		NumAccidentalsUsed = 0,
		title, composer, clipboardBuf, oClipboard, oText;

	oClipboard = g_UIOptions.textOutput.checkClipboard.checked;
	oText = g_UIOptions.radioText.checked;

	// Set up some details for later
	title = curScore.title;
	composer = curScore.composer;

	if (!startOutput()) {
		return;
	}

	minPitch = findLowPitch();
	maxPitch = findHighPitch();

	// Write out the header for the piece. If we have the title and the composer output both. 
	// If we have just the title output it. If we have neither. don't output any of it.
	// MuseScore returns an empty string instead of undefined, so we test for that.
	if (oText) {
		writeOutput("Bells Used");
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
			writeOutput("Title,Composer,Low Pitch,High Pitch,Octaves Used,");

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

		// sort the enharmonics for the min and the max pitch         
		g_pitch[minPitch].enharmonic.sort(sortenharmonics);
		g_pitch[maxPitch].enharmonic.sort(sortenharmonics);

		writeOutput(noteName(minPitch, g_pitch[minPitch].enharmonic[0]) + ",");
		writeOutput(noteName(maxPitch, g_pitch[maxPitch].enharmonic[0]) + ",");
		writeOutput(((findOctave(maxPitch) - findOctave(minPitch)) + 1) + ",");
	}

	// Iterate through all the notes from the bottom to the top printing out the ones that are used.
	for (idx = 0; idx < 127; idx++) {
		// Check if note is process the note  as used/unused
		if (g_pitch[idx].used) {
			// Find the proper octave
			octave = findOctave(idx);
			// update the number of bells used
			NumBellsUsed++;
			// sort the enharmonics 
			g_pitch[idx].enharmonic.sort(sortenharmonics);

			// cycle through the whole enharmonic array
			for (x = 0; x < g_pitch[idx].enharmonic.length; x++) {
				// If this enharmonic is contained within the enharmonic only array and this is our first time through increment the accidentals.
				if (onlyAccidentalRep(g_pitch[idx].enharmonic[x]) && x === 0) {
					NumAccidentalsUsed++;
				}

				// If we're starting a new octave put an extra line feed for text output in and set the highest octave
				if ((oText) && (octave > maxOctave)) {
					maxOctave = octave;
					writeOutput("\r\n");
				}

				// If we have more than one enharmonic seperate them with a slash for text, a dash for CSV.
				if (x !== 0) {
					if (oText) {
						writeOutput("\\");
					} else {
						writeOutput("-");
					}
				}
				writeOutput(noteName(idx, g_pitch[idx].enharmonic[x]));
			}
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
		writeOutput("\r\n" + (findOctave(maxPitch) - findOctave(minPitch)) + " octaves with " + NumBellsUsed + " bells used ranging from " + noteName(minPitch, g_pitch[minPitch].enharmonic[0]) + " to " + noteName(maxPitch, g_pitch[maxPitch].enharmonic[0]) + " with " + NumAccidentalsUsed + " accidentals.\r\n");
	}

	endOutput();
}

// Generates Score BUC

function scoreBUC() {

	var processPitch = function(pitch, writeSplitFlats) {
		var x, numEnharmonics;

		numEnharmonics = g_pitch[pitch].enharmonic.length;

		// if the pitch isn't used do nothing.
		if (!g_pitch[pitch].used) {
			return;
		}

		// Sort the enharmonics from greatest to least
		// Which is the pitch represented as the representation of the lowest note first.
		g_pitch[pitch].enharmonic.sort(function(a, b) {
			return b - a;
		});

		if (writeSplitFlats) {
			x = numEnharmonics - countFlats(g_pitch[pitch].enharmonic);
		} else {
			x = 0;
		}

		while (x < numEnharmonics) {
			// If we're on a flat enharmonic and we're on the clefsplit, don't put the note here, unless we're specifically writing the flats
			if (!writeSplitFlats && pitch === clefsplit && isFlat(g_pitch[pitch].enharmonic[x])) {
				return;
			}

			// Add the pitch to the Chord.
			note = new Note();
			note.pitch = pitch;
			note.tpc = g_pitch[pitch].enharmonic[x];

			// Print the right notehead type if there is another enharmonic representing this pitch.
			// Print an X note head if this isn't the most primary representation of an enharmonic
			if (notPrimary(note.tpc) && numEnharmonics !== 1 && (numEnharmonics === 3 || notTertiary(note.tpc))) {
				note.noteHead = 1;
			}

			// Check if the previously printed note has the same root pitch and octave, but a flat in front of it.
			// If so print the previous note again, so we don't get unwanted natural symbol. - Issue #6
			if (pitch !== 0 && lastnote.pitch !== 0 && (pitch - 1 === lastnote.pitch) && isFlat(lastnote.tpc) && (noteRoot(lastnote.tpc) === noteRoot(note.tpc))) {
				note.pitch = lastnote.pitch;
				note.tpc = lastnote.tpc;
			}

			addNote(note, 480);

			lastnote.pitch = pitch;
			lastnote.tpc = note.tpc;

			cursor.next();

			x++;
		}

		return;

		// Root Note

		function noteRoot(tpc) {
			return tpc % 7;
		}

		// Is tpc something other than primary?

		function notPrimary(tpc) {
			return tpc < 13 || tpc > 24;
		}

		// Is tpc something other that tertiary

		function notTertiary(tpc) {
			return tpc > 5 && tpc < 30;
		}

	};

	function addNote(note, tickLen) {
		chord = new Chord();
		chord.tickLen = tickLen;

		chord.addNote(note);
		cursor.add(chord);

		// Only omit the stem if its a dotted half or shorter.
		if (tickLen < 1920) {
			chord = cursor.chord();
			chord.noStem = true;
		}
	}

	function addEndNote() {
		// Figure out the length that the last note needs to be, and add it 
		addNote(lastnote, Math.abs(basslen - treblelen) * 480);
	}

	// Return the last TPC in an enharmonic array. Assumes the array is already sorted.

	function lastTPC(pitch) {
		var lastenharmonic;

		lastenharmonic = g_pitch[pitch].enharmonic.length - 1;

		return g_pitch[pitch].enharmonic[lastenharmonic];
	}

	// Returns true if tpc is not a flat

	function notFlat(tpc) {
		return tpc > 12;
	}

	// Returns true if tpc represents is a flat or double flat.

	function isFlat(tpc) {
		return tpc < 13;
	}

	function countFlats(enharmonic) {
		var x, flats = 0;

		for (x = 0; x < enharmonic.length; x++) {
			if (isFlat(enharmonic[x])) {
				flats++;
			}
		}

		return flats;

	}

	// Walks the Treble clef and passes our current position to function fnc.

	function walkTreble(fnc) {
		var x;

		for (x = clefsplit + 1; x <= 126; x++) {
			fnc(x);
		}
	}

	// Walks the Bass clef and passes our current position to function fnc.

	function walkBass(fnc) {
		var x;

		for (x = 0; x <= clefsplit; x++) {
			fnc(x);
		}
	}

	var notesInRange = function(x) {
		if (g_pitch[x].used) {
			usedpitches = usedpitches + g_pitch[x].enharmonic.length;
		}
	};

	function notesInTreble() {
		usedpitches = 0;

		walkTreble(notesInRange);

		// Add the flats in the split point to the treble as they'll be displayed with their associated natural
		usedpitches = usedpitches + countFlats(g_pitch[clefsplit].enharmonic);

		return usedpitches;
	}

	function notesInBass() {
		usedpitches = 0;

		walkBass(notesInRange);

		// Remove flats in the split point from the bass as they'll be displayed with their associated natural in the treble.
		usedpitches = usedpitches - countFlats(g_pitch[clefsplit].enharmonic);

		return usedpitches;
	}

	// Beginning of scoreBUC
	var title, composer, measurelen, idx, score, cursor, lastnote, basslen, treblelen, chord, note, usedpitches, clefsplit;

	// The tone where the split between the treble and the bass clef is. Any Flat TPCs will go in the treble, naturals and sharps in the bass
	clefsplit = 61;

	// Set up some details for later
	title = curScore.title;
	composer = curScore.composer;

	// Find the number of notes in each clef
	basslen = notesInBass();
	treblelen = notesInTreble();

	// Assign measure length to the larger between the notes in the Bass or treble clef.
	measurelen = Math.max(basslen, treblelen);

	// The last note written is a Note object. MuseScore sets lastnote.pitch = 0 here. 
	lastnote = new Note();

	// Set it invisible for the one time we print it.
	lastnote.visible = false;

	// Create the Score	
	score = new Score();

	score.title = title + " - Bells Used";
	score.composer = composer;

	// Make a measure of the appropriate length, so there are no barlines in the BUC.
	score.timesig = new TimeSig(measurelen, 4);
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
		QMessageBox.critical(g_UIMessage, "Instrument Not Installed", "The Blank Name Instrument is not installed, although the option for the using the Blank Name Instrument is selected. <br /><br />This option has been disabled. Please try to create your Bells Used Chart again.");

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

	walkBass(function(x) {
		processPitch(x, false)
	});

	// If we have fewer bass notes than treble notes add a hidden padding note.
	if (basslen < treblelen) {
		addEndNote();
	}


	// Treble Clef
	cursor.staff = 0;
	cursor.voice = 0;
	cursor.rewind();

	if (lastnote.tpc !== lastTPC(lastnote.pitch)) {
		processPitch(lastnote.pitch, true);
	}


	walkTreble(function(x) {
		processPitch(x, false)
	});

	// If we have fewer treble notes than bass notes add a hidden padding note.
	if (treblelen < basslen) {
		addEndNote();
	}

	// by ending the "undo" MuseScore will display the score.
	score.endUndo();

	return;
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
var bellsUsed = {
	majorVersion: 1,
	minorVersion: 1,
	menu: 'Plugins.Bells Used.Generate Bells Used Chart',
	init: GNDN,
	run: bellsUsed
};

bellsUsed;
