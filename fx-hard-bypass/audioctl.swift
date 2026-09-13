// audioctl: list | default | set-default <uid> | create-multi <name> <uid>... | destroy <deviceID>
import CoreAudio
import Foundation

func prop(_ sel: AudioObjectPropertySelector, _ scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal) -> AudioObjectPropertyAddress {
    return AudioObjectPropertyAddress(mSelector: sel, mScope: scope, mElement: kAudioObjectPropertyElementMain)
}
func getString(_ id: AudioObjectID, _ sel: AudioObjectPropertySelector) -> String {
    var addr = prop(sel); var size = UInt32(MemoryLayout<CFString?>.size); var value: CFString? = nil
    let st = withUnsafeMutablePointer(to: &value) { AudioObjectGetPropertyData(id, &addr, 0, nil, &size, $0) }
    return st == noErr ? (value as String? ?? "") : ""
}
func channels(_ id: AudioObjectID, _ scope: AudioObjectPropertyScope) -> Int {
    var addr = prop(kAudioDevicePropertyStreamConfiguration, scope); var size: UInt32 = 0
    guard AudioObjectGetPropertyDataSize(id, &addr, 0, nil, &size) == noErr, size > 0 else { return 0 }
    let buf = UnsafeMutablePointer<AudioBufferList>.allocate(capacity: Int(size)); defer { buf.deallocate() }
    guard AudioObjectGetPropertyData(id, &addr, 0, nil, &size, buf) == noErr else { return 0 }
    let list = UnsafeMutableAudioBufferListPointer(buf); return list.reduce(0) { $0 + Int($1.mNumberChannels) }
}
func allDevices() -> [AudioObjectID] {
    var addr = prop(kAudioHardwarePropertyDevices); var size: UInt32 = 0
    AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size)
    var ids = [AudioObjectID](repeating: 0, count: Int(size) / MemoryLayout<AudioObjectID>.size)
    AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size, &ids); return ids
}
func defaultOutput() -> AudioObjectID {
    var addr = prop(kAudioHardwarePropertyDefaultOutputDevice); var id: AudioObjectID = 0; var size = UInt32(MemoryLayout<AudioObjectID>.size)
    AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size, &id); return id
}
func subDevices(_ id: AudioObjectID) -> [String] {
    var addr = prop(kAudioAggregateDevicePropertyFullSubDeviceList); var size = UInt32(MemoryLayout<CFArray?>.size); var value: CFArray? = nil
    let st = withUnsafeMutablePointer(to: &value) { AudioObjectGetPropertyData(id, &addr, 0, nil, &size, $0) }
    return st == noErr ? ((value as? [String]) ?? []) : []
}
let args = CommandLine.arguments
switch args.count > 1 ? args[1] : "list" {
case "list":
    let def = defaultOutput()
    for id in allDevices() {
        let subs = subDevices(id)
        print("\(id)\t\(getString(id, kAudioObjectPropertyName))\tuid=\(getString(id, kAudioDevicePropertyDeviceUID))\tin=\(channels(id, kAudioObjectPropertyScopeInput)) out=\(channels(id, kAudioObjectPropertyScopeOutput))\(id == def ? "\tDEFAULT OUTPUT" : "")\(subs.isEmpty ? "" : "\tsub=\(subs.joined(separator: ","))")")
    }
case "default":
    let id = defaultOutput(); print("\(id)\t\(getString(id, kAudioObjectPropertyName))\tuid=\(getString(id, kAudioDevicePropertyDeviceUID))")
case "set-default":
    let uid = args[2]
    guard let id = allDevices().first(where: { getString($0, kAudioDevicePropertyDeviceUID) == uid }) else { print("no device with uid \(uid)"); exit(1) }
    var addr = prop(kAudioHardwarePropertyDefaultOutputDevice); var v = id
    let st = AudioObjectSetPropertyData(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, UInt32(MemoryLayout<AudioObjectID>.size), &v)
    print(st == noErr ? "default output -> \(getString(id, kAudioObjectPropertyName))" : "failed \(st)"); exit(st == noErr ? 0 : 1)
case "create-multi":
    let name = args[2]; let uids = Array(args[3...])
    let desc: [String: Any] = [
        kAudioAggregateDeviceNameKey: name, kAudioAggregateDeviceUIDKey: "roundaround-probe-\(Int(Date().timeIntervalSince1970))",
        kAudioAggregateDeviceIsStackedKey: 1,  // a multi-output device: every sub-device gets the same signal
        kAudioAggregateDeviceMainSubDeviceKey: uids[0],
        kAudioAggregateDeviceSubDeviceListKey: uids.map { [kAudioSubDeviceUIDKey: $0, kAudioSubDeviceDriftCompensationKey: 1] as [String: Any] }
    ]
    var id: AudioObjectID = 0
    let st = AudioHardwareCreateAggregateDevice(desc as CFDictionary, &id)
    print(st == noErr ? "created \(id) \(getString(id, kAudioObjectPropertyName)) uid=\(getString(id, kAudioDevicePropertyDeviceUID))" : "failed \(st)"); exit(st == noErr ? 0 : 1)
case "destroy":
    let id = AudioObjectID(args[2])!; let st = AudioHardwareDestroyAggregateDevice(id); print(st == noErr ? "destroyed \(id)" : "failed \(st)"); exit(st == noErr ? 0 : 1)
default: print("usage: audioctl list | default | set-default <uid> | create-multi <name> <uid>... | destroy <id>")
}
