import { useEffect, useState } from "react";

import { Storage } from "@plasmohq/storage";

import { ListType, type RelaxListEntry } from "~types";

import "./settings-style.css";

import { CodeIcon, MinusIcon, PlusIcon } from "@radix-ui/react-icons";
import {
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  Kbd,
  Link,
  Table,
  TextField,
  Tooltip
} from "@radix-ui/themes";

import TimePicker from "~components/time-picker";

document.documentElement.setAttribute("class", "dark"); // if something isn't getting styled, try moving it out

const BlockList = () => {
  const storage = new Storage(); // ref
  const [blockedPages, setBlockedPages] = useState([]);
  const [newPage, setNewPage] = useState("");

  useEffect(() => {
    const loadPages = async () => {
      const blockedPagesData = await storage.get("blocked_list");
      console.log("obj:", blockedPagesData);
      console.log("objParsed:", JSON.parse(blockedPagesData));
      setBlockedPages(JSON.parse(blockedPagesData));
    };

    loadPages();
  }, []);

  const handleAddPage = async () => {
    console.log("add clicked...");
    const updatedBlockedPages = [...blockedPages, newPage];
    setBlockedPages(updatedBlockedPages);
    await storage.set(
      ListType.BLOCKED_LIST,
      JSON.stringify(updatedBlockedPages)
    );
    setNewPage("");
  };

  const handleDeletePage = async (index) => {
    const updatedBlockedPages = [...blockedPages];
    updatedBlockedPages.splice(index, 1);
    setBlockedPages(updatedBlockedPages);
    await storage.set(
      ListType.BLOCKED_LIST,
      JSON.stringify(updatedBlockedPages)
    );
  };

  return (
    <Box>
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Heading as="h2">Blocklist</Heading>
          <Flex direction="row" gap="1" align="baseline">
            <TextField.Root>
              <TextField.Slot>
                <CodeIcon height="16" width="16" />
              </TextField.Slot>
              <TextField.Input
                value={newPage}
                placeholder="Enter an url..."
                onChange={(e) => setNewPage(e.target.value)}
                size="3"
              />
              <TextField.Slot pr="3">
                {/* todo: make it morph into 'enter' on focus */}
                <Kbd>Ctrl + /</Kbd>
              </TextField.Slot>
            </TextField.Root>

            <Button variant="classic" onClick={handleAddPage}>
              <PlusIcon width="16" height="16" /> Add
            </Button>
          </Flex>

          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>URL/Keyword</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>
                  Maybe some stat?
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {blockedPages.map((page, index) => (
                <Table.Row key={index}>
                  <Table.RowHeaderCell>{page}</Table.RowHeaderCell>
                  <Table.Cell>lorem ipsum dolor sit aaaa met!</Table.Cell>
                  <Table.Cell>
                    <IconButton
                      onClick={() => handleDeletePage(index)}
                      color="crimson"
                      variant="ghost">
                      <MinusIcon width="18" height="18"></MinusIcon>
                    </IconButton>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Flex>
      </Flex>
    </Box>
  );
};

const RelaxList = () => {
  const storage = new Storage();
  const [relaxPages, setRelaxPages] = useState<Array<RelaxListEntry>>([]);

  useEffect(() => {
    const loadList = async () => {
      const relaxListData = await storage.get("relax_list");
      console.log("relx objParsed:", JSON.parse(relaxListData));
      setRelaxPages(JSON.parse(relaxListData));
    };

    loadList();
  }, []);

  const handleDeleteEntry = async (index: number): Promise<void> => {
    const updatedRelaxPages = [...relaxPages];
    updatedRelaxPages.splice(index, 1);
    setRelaxPages(updatedRelaxPages);
    await storage.set(ListType.RELAX_LIST, JSON.stringify(updatedRelaxPages));
  };

  return (
    <Flex direction="column" gap="2">
      <Heading as="h2">Relax List</Heading>
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>URL</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Intent</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Dur?</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {relaxPages.map((entry: RelaxListEntry, index) => (
            <Table.Row key={index}>
              <Table.RowHeaderCell
                style={{
                  maxWidth: 140,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>
                <Tooltip content={entry.URL}>
                  <Link>{entry.URL}</Link>
                </Tooltip>
              </Table.RowHeaderCell>
              <Table.Cell>{entry.reason}</Table.Cell>
              <Table.Cell>{entry.duration}</Table.Cell>
              <Table.Cell>
                <IconButton
                  onClick={() => handleDeleteEntry(index)}
                  color="jade"
                  variant="ghost">
                  <MinusIcon width="18" height="18"></MinusIcon>
                </IconButton>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Flex>
  );
};

function SettingsPage() {
  return (
    <Flex direction="column" gap="3">
      <BlockList />
      <RelaxList />
      <Heading as="h2">Hours</Heading>
      <TimePicker />
    </Flex>
  );
}

export default SettingsPage;
