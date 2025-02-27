/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { KeyIconListItem } from '.';

it('renders a list item when provided with a text string', () => {
  render(<KeyIconListItem>Some text</KeyIconListItem>);
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});

it('hides non-semantic icon from screen-readers', async () => {
  render(<KeyIconListItem>Some text</KeyIconListItem>);
  expect(screen.getByTestId('list-item-icon')).toBeVisible();
  const accessibleImages = screen.queryAllByRole('img');
  expect(accessibleImages).toHaveLength(0);
});
