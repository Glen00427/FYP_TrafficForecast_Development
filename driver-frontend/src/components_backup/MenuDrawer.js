// src/components/MenuDrawer.js
import React from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function MenuDrawer({ open, onClose }) {
  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <div style={{ width: 250 }}>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
        <List>
          <ListItem button>
            <ListItemText primary="Home" />
          </ListItem>
          <ListItem button>
            <ListItemText primary="Traffic Map" />
          </ListItem>
          <ListItem button>
            <ListItemText primary="Settings" />
          </ListItem>
          <ListItem button>
            <ListItemText primary="About" />
          </ListItem>
        </List>
      </div>
    </Drawer>
  );
}
