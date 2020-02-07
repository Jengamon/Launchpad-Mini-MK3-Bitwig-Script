const SYSEX_HEADER = "f0002029020d";
const PLAY_COLOR = 0x1A;
const RECORD_COLOR = 0x5;

const STOPPED_COLOR = 0x79;
const PLAYING_COLOR = 0x78;

const SOLO_ON_COLOR = 0x7C;
const SOLO_OFF_COLOR = 0x7D;

const MUTE_ON_COLOR = 0x54;
const MUTE_OFF_COLOR = 0x53;

var session_in, session_out;
var tracks, ssm;

function init() {
   transport = host.createTransport();
   tracks = host.createTrackBank(8, 0, 8, false);

   // TODO Build hardware model using HardwareSurface

   session_in = host.getMidiInPort(0);
   session_out = host.getMidiOutPort(0);

   // Setup callbacks

   // Handle session mode stuff using callbacks
   session_in.setMidiCallback(onMidi0);
   session_in.setSysexCallback(onSysex0);

   host.getMidiInPort(1).setMidiCallback(stopText);
   host.getMidiInPort(1).setSysexCallback((data) => println(`RECEIVED ${data}`));

   // Set to DAW mode
   session_out.sendSysex(`${SYSEX_HEADER}1001f7`);

   // Swap to session mode
   session_out.sendSysex(`${SYSEX_HEADER}0000f7`);
   host.showPopupNotification("Mode: Session");

   // Forward all custom mode inputs to Bitwig.
   let ni = host.getMidiInPort(1).createNoteInput("Custom Input", "??????");
   ni.setShouldConsumeEvents(false);

   // Mark necessary stuff as interesting
   for(let i = 0; i < 8; i++) {
     let track = tracks.getItemAt(i);
     track.arm().markInterested();
     let cb = track.clipLauncherSlotBank();
     for(let j = 0; j < 8; j++) {
       cb.getItemAt(j).hasContent().markInterested();
     }
   }

   setupSessionView();

   // TODO: Perform further initialization here.
   println("Launchpad Mini Mk3 initialized!");
}

function toHexString(byteArray) {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

// Example "Good luck" looping at 32 pads per second using palette color 54 (Bitwig Orange?) -> displayText("01", "20", "0054", "Good luck")
function displayText(speed, colour, text) {
  let barr = [];
  for(let i = 0; i < text.length; i++) {
    barr.push(text.charCodeAt(i));
  }
  let htext = toHexString(barr);
  println(htext);
  session_out.sendSysex(`${SYSEX_HEADER}0700${speed}${colour}${htext}F7`);
}

// We receive a short MIDI input from Session View. (now we have to handle it based off of its status)
function onMidi0(status, data1, data2) {
   // TODO: Implement your MIDI input handling code here.
   // Stop text on next press
   if(data2 == 127) {
     stopText();
   }
   println(`MIDI0 input: ${status}, ${data1}, ${data2}`);
   //displayText("10", "0054", "Good luck!");
   if(status == 0xB0) { // (CC pressed) Either the arrows, mode select, row selectors or StopSoloMute was pressed.
     // switch action based off of CC pressed.
     switch(data1) {
       case 93: // Left
        if(data2 == 127) { // on press
          // displayText("10", "0001", "Left");
          tracks.scrollBackwards();
        }
        break;
      case 94: // Right
        if(data2 == 127) { // on press
          // displayText("10", "0001", "Right");
          tracks.scrollForwards();
        }
        break;
      case 91: // Up
        if(data2 == 127) { // on press
          // displayText("10", "0001", "Up");
          tracks.sceneBank().scrollBackwards();
        }
        break;
      case 92: // Down
        if(data2 == 127) { // on press
          // displayText("10", "0001", "Down");
          tracks.sceneBank().scrollForwards();
        }
        break;
      case 89: // Top row, trigger scene
        tracks.sceneBank().launchScene(0);
        break;
      case 79: // Second row, trigger scene
        tracks.sceneBank().launchScene(1);
        break;
      case 69:
        tracks.sceneBank().launchScene(2);
        break;
      case 59:
        tracks.sceneBank().launchScene(3);
        break;
      case 49:
        tracks.sceneBank().launchScene(4);
        break;
      case 39:
        tracks.sceneBank().launchScene(5);
        break;
      case 29:
        tracks.sceneBank().launchScene(6);
        break;
      case 19: // StopSoloMute
        if(data2 == 127) { // on press
          ssm.mode = (ssm.mode + 1) % 4;
          ssm.colorAllPads();
          ssm.refresh();
        }
        break;
       // Can't really do much with these cc
       case 95:
        host.showPopupNotification("Mode: Session");
        break;
       case 96:
        host.showPopupNotification("Mode: Drums");
        break;
       case 97:
        host.showPopupNotification("Mode: Keys");
        break;
       case 98:
        host.showPopupNotification("Mode: User");
        break;
      case 99:
       default:
        break;
     }
   } else if (status == 0x90) {
     // A pad was pressed. First find the associated track and clip, then launch it.
     if(data1 > 80 && data1 < 89) {
       // First scene
       let index = data1 - 81;
       launchClip(index, 0);
     } else if(data1 > 70 && data1 < 79) {
       // Second scene
       let index = data1 - 71;
       launchClip(index, 1);
     } else if(data1 > 60 && data1 < 69) {
       // Second scene
       let index = data1 - 61;
       launchClip(index, 2);
     } else if(data1 > 50 && data1 < 59) {
       // Second scene
       let index = data1 - 51;
       launchClip(index, 3);
     } else if(data1 > 40 && data1 < 49) {
       // Second scene
       let index = data1 - 41;
       launchClip(index, 4);
     } else if(data1 > 30 && data1 < 39) {
       // Second scene
       let index = data1 - 31;
       launchClip(index, 5);
     } else if(data1 > 20 && data1 < 29) {
       // Second scene
       let index = data1 - 21;
       launchClip(index, 6);
     } else if (data1 > 10 && data1 < 19) {
       // The last row, which can switch from SSM mode to clip mode
       let index = data1 - 11;
       let track = tracks.getItemAt(index);
       switch(ssm.mode) {
         case 0:
          // Normal clip operation
          launchClip(index, 7);
          break;
        case 1: // Stop mode
          if(data2 == 127) {
            track.stop();
          }
          break;
        case 2: // Solo mode
          if(data2 == 127) {
            track.solo().toggle(false);
          }
          break;
        case 3: // Mute mode
          if(data2 == 127) {
            track.mute().toggle();
          }
          break;
       }
     }
   }
}

function launchClip(track_index, slotIndex) {
  let track = tracks.getItemAt(track_index);
  let clip = track.clipLauncherSlotBank().getItemAt(slotIndex);
  // Check if clip has content. If it does, launch it. If it doesn't, stop the track.
  if(clip.hasContent().get()) {
    clip.launch();
  } else {
    if(track.arm().get()) {
      clip.launch();
    } else {
      track.stop();
    }
  }
}

let midi_queue = [];

function setPadSolid(pad_num, colour) {
  // session_out.sendMidi(0x90, pad_num, colour);
  midi_queue.push({status: 0x90, pad_num, color: colour});
}

function setPadFlash(pad_num, colour) {
  // session_out.sendMidi(0x91, pad_num, colour);
  midi_queue.push({status: 0x91, pad_num, color: colour});
}

function setPadPulse(pad_num, colour) {
  // session_out.sendMidi(0x92, pad_num, colour);
  midi_queue.push({status: 0x92, pad_num, color: colour});
}

function SceneObserver(pi) {
  this.pad_index = pi;
  this.initialize();
}

SceneObserver.prototype.initialize = function() {
  this.clip_color = [1, 1, 1, 1, 1, 1, 1, 1];
  this.current_state = [-1, -1, -1, -1, -1, -1, -1, -1];
  this.queued = [false, false, false, false, false, false, false, false];
  this.armed = [false, false, false, false, false, false, false, false];
}

SceneObserver.prototype.stateObserve = function(slotIndex, playbackState, isQueued) {
  // println(`SO${this.pad_index}: ${slotIndex} ${playbackState} ${isQueued}`)

  // If the current_state == -1 ("uninit") and we are told that we are currently stopped, do not update.
  // Updating would cause desyncs if one project had played clips and the new project does not have any clips at all.
  if(this.current_state[slotIndex] == -1 && playbackState == 0 && isQueued == false) {
    return;
  }

  this.current_state[slotIndex] = playbackState;
  this.queued[slotIndex] = isQueued;
};

SceneObserver.prototype.colorPad = function(slotIndex) {
  let pad_index = this.pad_index + slotIndex + 1;
  let state = this.current_state[slotIndex];
  let queued = this.queued[slotIndex];
  let color = this.clip_color[slotIndex];
  let armed = this.armed[slotIndex];

  if(state != -1) println(`Coloring ${pad_index} ${state} ${queued} ${color} ${armed} ${transport.isPlaying().get()}`);
  if(transport.isPlaying().get()) {
    switch(state) {
      case -1:
        // Uninitialized pad.
        if(armed) {
          setPadSolid(pad_index, 0x7);
        }
        break;
      case 0: // stopped
        setPadSolid(pad_index, color);
        if(queued) {
          setPadFlash(pad_index, 0x05);
        }
        break;
      case 1: // playing
        setPadSolid(pad_index, color);
        if(queued) {
          setPadFlash(pad_index, PLAY_COLOR);
        } else {
          setPadPulse(pad_index, PLAY_COLOR);
        }
        break;
      case 2: // recording
        setPadSolid(pad_index, color);
        if(queued) {
          setPadFlash(pad_index, RECORD_COLOR);
        } else {
          setPadPulse(pad_index, color);
        }
        break;
      default:
        host.errorln(`Invalid pad state: ${pad_index} ${state}`);
    }
  } else {
    switch(state) {
      case -1:
        // Uninitialized pad.
        if(armed) {
          setPadSolid(pad_index, 0x7);
        }
        break;
      case 0: // stopped
        setPadSolid(pad_index, color);
        break;
      case 1: // playing
        setPadSolid(pad_index, color);
        setPadFlash(pad_index, PLAY_COLOR);
        break;
      case 2: // recording
        setPadSolid(pad_index, color);
        setPadFlash(pad_index, RECORD_COLOR);
        break;
      default:
        host.errorln(`Invalid pad state: ${pad_index} ${state}`);
    }
  }
}

SceneObserver.prototype.colorObserve = function(slotIndex, red, green, blue) {
  // println(`CO${this.pad_index}: ${slotIndex} ${red} ${green} ${blue}`);
  let color = find_novation_color(red, green, blue);
  if(color != 0) {
    this.clip_color[slotIndex] = color;

    // If we haven't recorded a state, record the state as stopped.
    if(this.current_state[slotIndex] === -1) {
      this.current_state[slotIndex] = 0;
    }
  } else {
    // Deinit the pad
    this.current_state[slotIndex] = -1;
  }

};

SceneObserver.prototype.colorAllPads = function() {
  for(let i = 0; i < 8; i++) {
    this.colorPad(i);
  }
}

// This class handles the bottom row
function SSMSceneObserver(pi) {
  SceneObserver.call(this, pi);
  this.initialize();
  this.mode = 0; // 0 - Nothing, 1 - Stop, 2 - Solo, 3 - Mute
}

SSMSceneObserver.prototype = Object.create(SceneObserver.prototype);

SSMSceneObserver.prototype.initialize = function() {
  SceneObserver.prototype.initialize.call(this);
  this.stop_flags = [true, true, true, true, true, true, true, true];
  this.solo_flags = [false, false, false, false, false, false, false, false];
  this.mute_flags = [false, false, false, false, false, false, false, false];
  this.exists = [false, false, false, false, false, false, false, false];
};

SSMSceneObserver.prototype.setSolo = function(trackIndex, soloValue) {
  this.solo_flags[trackIndex] = soloValue;
}

SSMSceneObserver.prototype.setMute = function(trackIndex, muteValue) {
  this.mute_flags[trackIndex] = muteValue;
}

SSMSceneObserver.prototype.setStopped = function(trackIndex, stoppedValue) {
  this.stop_flags[trackIndex] = stoppedValue;
}

SSMSceneObserver.prototype.colorPad = function(slotIndex) {
  let pad_index = this.pad_index + slotIndex + 1;
  let stop = this.stop_flags[slotIndex];
  let solo = this.solo_flags[slotIndex];
  let mute = this.mute_flags[slotIndex];
  let exists = this.exists[slotIndex];
  switch(this.mode) {
    case 0:
      // Default to parent's behavior
      SceneObserver.prototype.colorPad.call(this, slotIndex);
      break;
    case 1: // Stop
      if(exists) {
        if(stop) {
          setPadSolid(pad_index, STOPPED_COLOR);
        } else {
          setPadSolid(pad_index, PLAYING_COLOR);
        }
      }
      break;
    case 2: // Solo
      if(exists) {
        if(solo) {
          setPadSolid(pad_index, SOLO_ON_COLOR);
        } else {
          setPadSolid(pad_index, SOLO_OFF_COLOR);
        }
      }
      break;
    case 3: // Mute
      if(exists) {
        if(mute) {
          setPadSolid(pad_index, MUTE_ON_COLOR);
        } else {
          setPadSolid(pad_index, MUTE_OFF_COLOR);
        }
      }
      break;
    default:
      host.errorln(`Invalid SSM mode: ${this.mode}`);
  }
};

// Update the session view pads like the Ableton integration
function setupSessionView() {
  let so = [];
  let pad_rows = [80, 70, 60, 50, 40, 30, 20];
  for(let i = 0; i < 7; i++) {
    so.push(new SceneObserver(pad_rows[i]));
  }

  // Create the special bottom row
  ssm = new SSMSceneObserver(10);

  function refresh() {
    update(so, ssm);
  }

  // Copy the refresh method to ssm.
  ssm.refresh = refresh;

  for(let t = 0; t < 8; t++) {
    let track = tracks.getItemAt(t);
    let clsb = track.clipLauncherSlotBank();
    clsb.addPlaybackStateObserver((s, ps, q) => {
      if(s < so.length) { so[s].stateObserve(t, ps, q); } else {
        // s == 7
        ssm.stateObserve(t, ps, q);
      }
      refresh();
    });
    clsb.addColorObserver((s, r, g, b) => {
      if(s < so.length) { so[s].colorObserve(t, r, g, b); } else {
        // s == 7
        ssm.colorObserve(t, r, g, b);
      }
      refresh();
    });

    track.arm().addValueObserver((as) => {
      for(let i = 0; i < 7; i++) {
        so[i].armed[t] = as;
      }
      ssm.armed[t] = as;
      refresh();
    });

    transport.isPlaying().addValueObserver(() => refresh());

    track.position().addValueObserver((pos) => print(`T: ${t} ${pos}`));
    track.solo().addValueObserver((v) => { ssm.setSolo(t, v); refresh() });
    track.mute().addValueObserver((v) => { ssm.setMute(t, v); refresh() });
    track.isStopped().addValueObserver((v) => { ssm.setStopped(t, v); refresh() });
    track.exists().addValueObserver((v) => { ssm.exists[t] = v; });
  }
}

function stopText() {
  session_out.sendSysex(`${SYSEX_HEADER}07F7`);
}

let produce = () => {};
function update(so, ssm) {
  produce = () => {
    for(let j = 0; j < 7; j++) {
      so[j].colorAllPads();
    }
    ssm.colorAllPads();
  };
  host.requestFlush();
}

function onSysex0(data) {
  printSysex(data);
}

function flush() {
  // Produce the messages
  produce();

  let pads = {};

  // Set all pad states to clear
  let row_offs = [80, 70, 60, 50, 40, 30, 20, 10];
  for(let i = 0; i < row_offs.length; i++) {
    for(let j = 1; j < 9; j++) {
      pads[row_offs[i] + j] = true;
    }
  }

  let mq = midi_queue;
  midi_queue = [];

  // Send the messages
  for(let i = 0; i < mq.length; i++) {
    let mess = mq[i];
    // println(`Sending message ${mess.status} ${mess.pad_num} ${mess.color}`);
    session_out.sendMidi(mess.status, mess.pad_num, mess.color);
    // Don't reset the set pad.
    pads[mess.pad_num] = false;
  }

  // Clear any not set pads
  let pad_labels = Object.keys(pads);
  for(let i = 0; i < pad_labels.length; i++) {
    let key = pad_labels[i];
    if(pads[key]) {
      session_out.sendMidi(0x90, key, 0);
      session_out.sendMidi(0x91, key, 0);
      session_out.sendMidi(0x92, key, 0);
    }
  }
}

function exit() {
  // Set to Standalone mode and reset internal state.
  session_out.sendSysex(`${SYSEX_HEADER}1000F7`);
  tracks = null;
  session_in = null;
  session_out = null;
}