import { Flex, Text } from "@radix-ui/themes";

import { useStorage } from "@plasmohq/storage/hook";

// import "./time-picker-style.css";

// WorkTimePicker
function TimePicker() {
  const [workTimeStart, setWorkTimeStart] = useStorage("work_time_start");
  const [workTimeEnd, setWorkTimeEnd] = useStorage("work_time_end");

  function timeStringToUnixTimestamp(timeString) {
    const [hour, minute] = timeString.split(":").map(Number);

    const currentDate = new Date();
    currentDate.setHours(hour, minute, 0, 0); // Set hours, minutes, reset seconds and milliseconds

    return currentDate.getTime(); // This returns the timestamp in milliseconds
  }

  function unixTimestampToTimeString(timestamp) {
    const date = new Date(timestamp);

    // Extract hour and minute, then pad them to ensure they are 2 digits
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
  }

  const handleStartTimeChange = (event) => {
    setWorkTimeStart(timeStringToUnixTimestamp(event.target.value));
  };
  const handleEndTimeChange = (event) => {
    setWorkTimeEnd(timeStringToUnixTimestamp(event.target.value));
  };

  return (
    <Flex direction="row" gap="3" align="center" className="TimePicker">
      <input
        type="time"
        name="time_picker_start"
        id="time_ps"
        step="600"
        onChange={handleStartTimeChange}
        value={unixTimestampToTimeString(workTimeStart) || ""}
      />
      <Text>to</Text>
      <input
        type="time"
        name="time_picker_end"
        id="time_pe"
        step="600"
        onChange={handleEndTimeChange}
        value={unixTimestampToTimeString(workTimeEnd) || ""}
      />
    </Flex>
  );
}

export default TimePicker;
