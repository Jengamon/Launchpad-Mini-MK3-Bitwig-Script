loadAPI(10);

// Remove this if you want to be able to use deprecated methods without causing script to stop.
// This is useful during development.
host.setShouldFailOnDeprecatedUse(true);

host.defineController("Novation", "Launchpad Mini Mk3", "0.9", "2ec716b0-450a-4269-bbb2-39ade3188648", "Jengamon");

host.defineMidiPorts(2, 2);

if (host.platformIsWindows())
{
   // TODO: Set the correct names of the ports for auto detection on Windows platform here
   // and uncomment this when port names are correct.
   host.addDeviceNameBasedDiscoveryPair(["LPMiniMK3 MIDI", "MIDIIN2 (LPMiniMK3 MIDI)"], ["LPMiniMK3 MIDI", "MIDIOUT2 (LPMiniMK3 MIDI)"]);
}
else if (host.platformIsMac())
{
   // TODO: Set the correct names of the ports for auto detection on Mac OSX platform here
   // and uncomment this when port names are correct.
   // host.addDeviceNameBasedDiscoveryPair(["Input Port 0"], ["Output Port 0"]);
}
else if (host.platformIsLinux())
{
   // TODO: Set the correct names of the ports for auto detection on Linux platform here
   // and uncomment this when port names are correct.
   // host.addDeviceNameBasedDiscoveryPair(["Input Port 0"], ["Output Port 0"]);
}

load("./polyfill.js");
load("./find_color.js");
load("./driver.js")
