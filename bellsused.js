//=============================================================================
//  MuseScore
//
//  Bells Used Plugin v 1.0  
//  Derived from Mike Magatagan's Count Notes plugin
//
//  Copyright (C)2011 Mike Magatagan
//  Copyright (C)2012 Nicholas Barnard
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
//
// This is ECMAScript code (ECMA-262 aka "Java Script")
//
var g_pitch = []; // Pitch array
var g_form; // Dialog

// A blank function, since we don't need to run when MuseScore loads or closes, only when we're called.
function GNDN() {}

// Display Dialog
function DispDialog() {
	if (typeof curScore === 'undefined') {
		QMessageBox.critical(g_form, "Feedback", "Please Open a Score from which to Create a Bells Used Display.");
		return;
	}
	var loader = new QUiLoader(null);
	var file = new QFile(pluginPath + "/bellsused.ui");
	file.open(QIODevice.OpenMode(QIODevice.ReadOnly, QIODevice.Text));
	form = loader.load(file, null);
	form.buttonBox.accepted.connect(ProcessForm);
	form.show();
}

// Process the Form
function ProcessForm() {

	PopulatePitches();
	if (form.NewScore.checked) {
		ScoreBUC();
	}
	if (form.TextFile.checked || form.CSVFile.checked) {
		TextBUC();
	}
}


// Goes through the whole score Chord by Chord and populates the notes used into Pitch Array.
function PopulatePitches() {
	var idx, cursor, staff, voice, i, note, pitch, tone, chord, n;


	// Fill the pitch array with blanks.
	for (idx = 0; idx < 127; idx++) {
		g_pitch[idx] = BlankPitch();
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
						if (g_pitch[pitch].used === 1) {
							// Check to see if the enharmonic is already listed, if not add it.
							if (!contains(g_pitch[pitch].enharmonic, tone)) {
								g_pitch[pitch].enharmonic.push(tone);
							}
						} else {
							g_pitch[pitch].used = 1;
							g_pitch[pitch].enharmonic[0] = tone;
						}
					}
				}
				// Move the cursor to the next position.
				cursor.next();
			}
		}
	}

	// Create a Blank Pitch Object
	function BlankPitch() {
		var blank = {};

		blank.used = 0;
		blank.enharmonic = [];

		return blank;
	}

}

// Generates Text Based BUCs
//
function TextBUC() {

	var idx, unit, fName, file, textStream, octave, x, minPitch, maxPitch, maxOctave = 0,
		NumBellsUsed = 0,
		NumAccidentalsUsed = 0,
		title, composer, clipboardBuf, oClipboard, oText;

	oClipboard = form.ToClipboard.checked;
	oText = form.TextFile.checked;


	// These are enharmonics that can only be expressed as a sharp or flat
	var OnlyAccidental = [-1, 0, 8, 9, 10, 11, 12, 20, 21, 22, 23, 24, 32, 33];

	// This the order of enharmonics e.g. 14=C, 21=C#, etc.
	var EnharmonicOrder = [14, 21, 16, 23, 18, 13, 20, 15, 22, 17, 24, 19];

	// Set up some details for later
	title = curScore.title;
	composer = curScore.composer;

	if (!startOutput()) {
		return;
	}

	minPitch = findEnd(1);
	maxPitch = findEnd(-1);

	// Write out the header for the piece. If we have the title and the composer output both. 
	// If we have just the title output it. If we have neither. don't output any of it.
	if (oText) {
		writeOutput("Notes Used");
		if (title !== undefined) {
			writeOutput(" in \"" + title + "\"");
			if (composer !== undefined) {
				writeOutput(" By: " + composer);
			}
		}
		writeOutput(":\r\n");
	} else {
		if (form.IncludeHeader.checked) {
			// Write out all the header including all the notes in order
			writeOutput("Title,Composer,Low Pitch,High Pitch,Octaves Used,");

			for (x = 0; x < 127; x++) {
				writeOutput(NoteName(x, EnharmonicOrder[x % 12]) + ",");
			}
			writeOutput("\r\n");
		}
		if (title !== undefined) {
			writeOutput(title + ",");
			if (composer !== undefined) {
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

		writeOutput(NoteName(minPitch, g_pitch[minPitch].enharmonic[0]) + ",");
		writeOutput(NoteName(maxPitch, g_pitch[maxPitch].enharmonic[0]) + ",");
		writeOutput(((findOctave(maxPitch) - findOctave(minPitch)) + 1) + ",");
	}

	// Iterate through all the notes from the bottom to the top printing out the ones that are used.
	for (idx = 0; idx < 127; idx++) {

		// If used is 0 we didn't use that note. 
		if (g_pitch[idx].used === 0) {
			// Print an empty cell for CSV
			if (!oText) {
				writeOutput(",");
			}
			continue; // Skip the rest of the loop
		}

		// Find the proper octave
		octave = findOctave(idx);
		// update the number of bells used
		NumBellsUsed++;
		// sort the enharmonics 
		g_pitch[idx].enharmonic.sort(sortenharmonics);

		// cycle through the whole enharmonic array
		for (x = 0; x < g_pitch[idx].enharmonic.length; x++) {
			// If this enharmonic is contained within the enharmonic only array and this is our first time through increment the accidentals.
			if ((contains(OnlyAccidental, g_pitch[idx].enharmonic[x])) && x === 0) {
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

			writeOutput(NoteName(idx, g_pitch[idx].enharmonic[x]));


		}

		// if its text output output a linefeed, if CSV output output a comma.
		if (oText) {
			writeOutput("\r\n");
		} else {
			writeOutput(",");
		}
	}

	if (oText) {
		writeOutput("\r\n" + ((findOctave(maxPitch) - findOctave(minPitch)) + 1) + " octaves with " + NumBellsUsed + " bells used ranging from " + NoteName(minPitch, g_pitch[minPitch].enharmonic[0]) + " to " + NoteName(maxPitch, g_pitch[maxPitch].enharmonic[0]) + " with " + NumAccidentalsUsed + " accidentals.\r\n");
	}

	endOutput();

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
	// Return the note name
	function NoteName(pitch, enharmonic) {
		var notes = ["C", "G", "D", "A", "E", "B", "F"],
			accidental, accsymbols = ["bb", "b", "#", "##"];

		// find and assign the proper accidental
		if (enharmonic <= 5) {
			accidental = accsymbols[0];
		} else if (enharmonic <= 12) {
			accidental = accsymbols[1];
		} else if (enharmonic <= 19) {
			accidental = "";
		} else if (enharmonic <= 26) {
			accidental = accsymbols[2];
		} else {
			accidental = accsymbols[3];
		}

		// the enharmonics nicely line up with note names if we divide by 7 and take the remainder.
		return (notes[enharmonic % 7] + accidental + findOctave(pitch));

	}

	// Given a pitch, return what octave it is in.
	function findOctave(pitch) {
		// Find the proper octave and return it. Despite this looking odd a case/switch wouldn't work here
		// And thanks to Ben its so much cleaner than a series of If/Else statements

		return pitch < 12 ? 0 : pitch < 24 ? 1 : pitch < 36 ? 2 : pitch < 48 ? 3 : pitch < 60 ? 4 : pitch < 72 ? 5 : pitch < 84 ? 6 : pitch < 96 ? 7 : pitch < 108 ? 8 : pitch < 120 ? 9 : 10;
	}
	// Start the output. 
	function startOutput() {

		if (!oClipboard) {
			// Open a file selection dlg
			if (oText) {
				fName = QFileDialog.getSaveFileName(g_form, "Select .txt file to create", "", "TXT file (*.txt)", 0);
			} else {
				fName = QFileDialog.getSaveFileName(g_form, "Select .csv file to create", "", "CSV file (*.csv)", 0);
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
				QMessageBox.critical(g_form, "File Error", "Could not create output file " + fName);
				return false;
			}
			textStream = new QTextStream(file);
			return true;
		} else {
			// Initialize clipboard buffer with a blank.
			clipboardBuf = "";
			return true;
		}
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
			QMessageBox.information(g_form, "Complete", "Bells Used on Clipboard");
		}
		return;
	}
}


function ScoreBUC() {
	var title, composer, measurelen, idx, score, cursor, lastpitch, basslen, treblelen, chord, note;

	// Set up some details for later
	title = curScore.title;
	composer = curScore.composer;

	// Find the number of notes in each clef
	// Middle C# (Midi Value 61) and lower in the Bass, Middle D (Midi Value 62) and higher in treble 
	basslen = NotesInRange(0, 61);
	treblelen = NotesInRange(62, 126);

	// Assign measure len to the larger between the notes in the Bass or treble clef.
	measurelen = Math.max(basslen, treblelen);

	// Create the Score	
	score = new Score();
	score.title = title + " - Bells Used";
	score.composer = composer;
	// Make a measure of the appropriate length, so there are no barlines in the BUC.
	score.timesig = new TimeSig(measurelen, 4);
	// Be explicit: we want C Major/A Minor (0 flats/sharps) in key sig.
	score.keysig = 0;
	// create two staff piano part, sadly the format for bells isn't what we'd like
	score.appendPart("Piano");
	score.appendMeasures(1);

	cursor = new Cursor(score);

	// Bass Clef
	cursor.staff = 1;
	cursor.voice = 0;
	cursor.rewind();

	// add the bass clef notes
	for (idx = 0; idx <= 61; idx++) {
		// Process the pitch, and if we added a pitch set the last note value
		if(ProcessPitch(idx)){
		lastpitch=idx;
		}
	}
    
    // If bass is smaller add a hidden padding note.
	
    if (basslen<treblelen) {
    	AddEndNote();
    }
        
     
	// Treble Clef
	cursor.staff = 0;
	cursor.voice = 0;
	cursor.rewind();

	// add the treble clef notes
	for (idx = 62; idx <= 126; idx++) {
		// Process the pitch, and if we added a pitch set the last note value
		if(ProcessPitch(idx)){
			lastpitch=idx;
		}
	}
	
	// If treble is smaller add a hidden padding note.
		
	if (treblelen<basslen) {
    	AddEndNote();    
    }

    
	return;


	function ProcessPitch(pitch) {
		var x;

		// if the pitch isn't used do nothing.
		if (g_pitch[pitch].used === 0) {
			return false;
		}

		// Sort the enharmonics from greatest to least
		// Which is the pitch represented as the representation of the lowest note first.
		g_pitch[pitch].enharmonic.sort(function (a, b) {return b - a});

		for (x = 0; x < g_pitch[pitch].enharmonic.length; x++){
		// x=function (x){x++; cursor.next(); return x}) {
			// Create the Chord Length
			chord = new Chord();
			chord.tickLen = 480; 
			
			// Add the pitch to the Chord.
			note = new Note();
			note.pitch = pitch;
			note.tpc = g_pitch[pitch].enharmonic[x];
			
		// If this isn't the primary representation of a note and we have two representations of it
		// print it as an "x". Admittedly this fails in an edge case where we have two non-primary representations 
		// of notes, but a composer writing Double Flats and Double Sharps for bells can either write their own bells used
		// or ask me to fix this.
		
		    if(((note.tpc<13)||(note.tpc>24))&&(g_pitch[pitch].enharmonic.length!==1)){
				note.noteHead=1;
			}
			chord.addNote(note);
			cursor.add(chord);

			chord = cursor.chord();
    		chord.noStem = true;
			
			cursor.next();
			
		}
    return true;

	}
	
	function AddEndNote(){
	chord = new Chord();
	// Figure out the length of the hidden note.
    chord.tickLen = Math.abs(basslen - treblelen) * 480;

    note = new Note();
	note.pitch = lastpitch;
    note.visible = false;

    chord.addNote(note);
    cursor.add(chord);
	
	}

	function NotesInRange(begin, end) {
		var usedpitches = 0, x;

		// Work through the range and add up the number of individual notes we have to display.
		for (x = begin; x <= end; x++) {
			if (g_pitch[x].used === 1) {
				usedpitches=usedpitches + g_pitch[x].enharmonic.length;
			}
		}
		return usedpitches;

	}
}

// Find the first or last note used. 
// x = 1 if we're starting at 0 going to 127.
// x = -1 if we're starting at 127 going to 0.
	function findEnd(direction) {
		var x;

		if (direction === 1) {
			x = 0;
		} else {
			x = 126;
		}

		while (g_pitch[x].used === 0) {
			x = x + direction;
		}

		// Wherever stopped is the end.
		return x;
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
var mscorePlugin = {
	majorVersion: 1,
	minorVersion: 1,
	menu: 'Plugins.Bells Used',
	init: GNDN,
	run: DispDialog
};

mscorePlugin;