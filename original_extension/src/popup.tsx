import { useEffect, useState } from "react";

import { useStorage } from "@plasmohq/storage/hook";

import "./font.css";
import "./popup-style.css";
import "@radix-ui/themes/styles.css";

import {
  PauseIcon,
  PlayIcon,
  ResetIcon,
  ResumeIcon
} from "@radix-ui/react-icons";
import {
  Box,
  Button,
  Flex,
  IconButton,
  Tabs,
  Text,
  Theme
} from "@radix-ui/themes";

import SettingsPage from "~tabs/settings-page";

const PomodoroPlayer = () => {
  const pomodoroFocusTarget = () => new Date().getTime() + 20 * 60 * 1000;
  const pomodoroPauseTarget = () => new Date().getTime() + 5 * 60 * 1000; // 5 minutes pause time
  // Retrieve the start time from storage

  const [focusStartTime, setFocusStartTime] = useStorage(
    "pom_focus_start_time"
  );
  const [pauseStartTime, setPauseStartTime] = useStorage(
    "pom_pause_start_time"
  );
  const [isPaused, setIsPaused] = useStorage("pom_focus_is_paused");

  const [remainingTime, setRemainingTime] = useState(
    calculateRemainingTime(focusStartTime)
  ); // just store it, so we can read it bgscript, or make it influence a stored "isrunning" state
  const focusRemaining = calculateRemainingTime(focusStartTime);
  const pauseRemaining = calculateRemainingTime(pauseStartTime);

  const isIdle = !focusStartTime && !pauseStartTime;
  const isRunning = focusStartTime && !isPaused;
  const isOnBreak = pauseStartTime && isPaused;
  // re-render on every focusStartTime change
  useEffect(() => {
    setRemainingTime(calculateRemainingTime(focusStartTime));
    const timer = setInterval(() => {
      setRemainingTime(calculateRemainingTime(focusStartTime));
    }, 1000);

    return () => clearInterval(timer);
  }, [focusStartTime, pauseStartTime]);

  const start = () => {
    setFocusStartTime(pomodoroFocusTarget());
    setPauseStartTime(null);
    setIsPaused(false);
  };

  const pause = () => {
    setPauseStartTime(pomodoroPauseTarget());
    setIsPaused(true);
  };

  const resume = () => {
    setFocusStartTime(pomodoroFocusTarget());
    setPauseStartTime(null);
    setIsPaused(false);
  };

  const reset = () => {
    setFocusStartTime(null);
    setPauseStartTime(null);
    setIsPaused(false);
  };

  function calculateRemainingTime(endTime) {
    if (!endTime) return { minutes: 0, seconds: 0 };
    const difference = endTime - new Date().getTime();
    const minutes = Math.floor(difference / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    return { minutes, seconds };
  }

  function formatRemainingTime(remainingTime) {
    let timeText = "";

    if (remainingTime.minutes > 0) {
      timeText += `${remainingTime.minutes} minute${
        remainingTime.minutes > 1 ? "s" : ""
      }`;
    }

    if (remainingTime.minutes > 0 && remainingTime.seconds > 0) {
      timeText += " and ";
    }

    if (remainingTime.seconds > 0) {
      timeText += `${remainingTime.seconds} second${
        remainingTime.seconds > 1 ? "s" : ""
      }`;
    }

    if (timeText) {
      isPaused && (timeText += " of pause");
      timeText += " remaining";
    } else {
      timeText = "Break time!";
    }

    return timeText;
  }

  return (
    <div>
      <Text>
        {formatRemainingTime(isOnBreak ? pauseRemaining : focusRemaining)}
      </Text>
      <br />
      <IconButton
        style={{ marginRight: "2px" }}
        onClick={start}
        disabled={!isIdle}>
        <PlayIcon width="16" height="16" />
      </IconButton>
      <IconButton
        style={{ marginRight: "2px" }}
        onClick={pause}
        disabled={!isRunning}>
        <PauseIcon width="16" height="16" />
      </IconButton>
      <IconButton
        style={{ marginRight: "2px" }}
        onClick={resume}
        disabled={!isOnBreak}>
        <ResumeIcon width="16" height="16" />
      </IconButton>
      <IconButton onClick={reset} disabled={isIdle}>
        <ResetIcon width="16" height="16" />
      </IconButton>
    </div>
  );
};

function IndexPopup() {
  useEffect(() => {
    // WA: Radix doesn't apply "dark" to root elem. Why?
    document.documentElement.setAttribute("class", "radix-themes dark"); // if something isn't getting styled, try moving it out
  }, []);
  return (
    <Theme
      className="dark"
      accentColor="yellow"
      appearance="dark"
      panelBackground="solid"
      scaling="100%"
      radius="large">
      <Flex direction="column" gap="4">
        <Tabs.Root defaultValue="home">
          <Tabs.List size="2">
            <Tabs.Trigger value="home">Home</Tabs.Trigger>
            <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
            <Tabs.Trigger value="account">Account</Tabs.Trigger>
          </Tabs.List>

          <Box px="4" pt="3" pb="2">
            <Tabs.Content value="account">
              <Text size="2">Welcome to focus bear.</Text>
            </Tabs.Content>

            <Tabs.Content value="home">
              <Text size="2">This will be the main control area.</Text>
              <div className="pomodoro_player">
                <h2>Pomodoro</h2>
                <PomodoroPlayer />
              </div>
            </Tabs.Content>

            <Tabs.Content value="settings">
              <SettingsPage />
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      </Flex>
    </Theme>
  );
}

export default IndexPopup;
