import { Storage } from "@plasmohq/storage";

import { ListType, type RelaxListEntry } from "~types";

let lastBlockedURL = "";

(async () => {
  const storage = new Storage();

  // Listen for messages from splash-page
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action == "getLastBlockedURL") {
      sendResponse({ url: lastBlockedURL });
    }
  });

  const getBlockedList = async () => {
    const blocked_list_data: string = await storage.get(ListType.BLOCKED_LIST);
    const blocked_list: Array<string> = blocked_list_data
      ? JSON.parse(blocked_list_data)
      : [];
    console.debug("blocked_list:", blocked_list);
    return blocked_list;
  };

  const getRelaxList = async (): Promise<Array<RelaxListEntry>> => {
    const relax_list_data: string = await storage.get(ListType.RELAX_LIST);

    let relax_list: Array<RelaxListEntry> = [];

    try {
      relax_list = relax_list_data ? JSON.parse(relax_list_data) : [];

      if (
        !Array.isArray(relax_list) ||
        !relax_list.every((entry) => "URL" in entry && "reason" in entry)
      ) {
        throw new Error("Invalid RelaxList data structure");
      }
    } catch (err) {
      console.error("Failed to parse relaxList", err);
    }

    console.debug("relax_list:", relax_list);
    return relax_list;
  };

  let blocked_list: Array<string> = await getBlockedList();
  let relax_list: Array<RelaxListEntry> = await getRelaxList();

  storage.watch({
    blocked_list: async (c) => {
      blocked_list = await getBlockedList();
    },
    relax_list: async (c) => {
      relax_list = await getRelaxList();
    }
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      // Parallelize fetching from storage
      const [
        pom_start_time_str,
        pom_is_focus_paused_str,
        work_time_start_str,
        work_time_end_str
      ] = await Promise.all([
        storage.get("pom_focus_start_time"),
        storage.get("pom_focus_is_paused"),
        storage.get("work_time_start"),
        storage.get("work_time_end")
      ]);
      console.log("Data to parse:", work_time_end_str);
      const pom_start_time: number = pom_start_time_str
        ? JSON.parse(pom_start_time_str)
        : -1;
      const pom_is_focus_paused: boolean = pom_is_focus_paused_str
        ? JSON.parse(pom_is_focus_paused_str)
        : false;
      const work_time_start: number = work_time_start_str
        ? JSON.parse(work_time_start_str)
        : -1;

      const work_time_end: number = work_time_end_str
        ? JSON.parse(work_time_end_str)
        : -1;

      // todo: pararellize the awaits with promise.all or something
      const is_pomodoro_running = (): boolean => {
        const currentTime: number = new Date().getTime();
        const difference: number = pom_start_time - currentTime;
        return difference > 0;
      };
      const is_work_time = (): boolean => {
        const currentTime: number = new Date().getTime();
        return (
          work_time_start &&
          work_time_end &&
          currentTime >= work_time_start &&
          currentTime <= work_time_end
        );
      };

      const is_blocked: boolean =
        tab.url &&
        blocked_list.length > 0 &&
        blocked_list.some((blockedUrl) => tab.url.includes(blockedUrl));
      const is_relax_page: boolean = relax_list.some((entry) =>
        tab.url.includes(entry.URL)
      );
      tab.url && console.log("is_pomodoro_running: ", is_pomodoro_running());
      if (
        ((is_work_time() && is_blocked) ||
          (!is_work_time() &&
            is_blocked &&
            is_pomodoro_running() &&
            !pom_is_focus_paused)) &&
        !is_relax_page
      ) {
        lastBlockedURL = tab.url;
        chrome.tabs.update(tabId, { url: "/tabs/splash-page.html" });
      }
    }
  });
})();

export {};
