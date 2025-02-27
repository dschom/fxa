/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useCallback } from 'react';
import { copy } from '../../lib/clipboard';
import { ReactComponent as CopyIcon } from './copy.svg';
import { ReactComponent as InlineCopyIcon } from './copy-inline.svg';
import { ReactComponent as DownloadIcon } from './download.svg';
import { ReactComponent as PrintIcon } from './print.svg';
import { useAccount, useFtlMsgResolver } from '../../models';
import { FtlMsg } from 'fxa-react/lib/utils';

export type DownloadContentType =
  | 'Firefox account recovery key'
  | 'Firefox backup authentication codes'
  | 'Firefox';

const DownloadContentTypeL10nMapping: Record<DownloadContentType, string> = {
  Firefox: 'get-data-trio-title-firefox',
  'Firefox backup authentication codes':
    'get-data-trio-title-firefox-backup-verification-codes',
  'Firefox account recovery key': 'get-data-trio-title-firefox-recovery-key',
};

export type GetDataTrioProps = {
  value: string | string[];
  contentType?: DownloadContentType;
  onAction?: (type: 'download' | 'copy' | 'print') => void;
};

export const GetDataCopySingleton = ({ value, onAction }: GetDataTrioProps) => {
  return (
    <FtlMsg id="get-data-trio-copy-2" attrs={{ title: true, ariaLabel: true }}>
      <button
        title="Copy"
        type="button"
        onClick={async () => {
          const copyValue = Array.isArray(value) ? value.join('\r\n') : value;
          await copy(copyValue);
          onAction?.('copy');
        }}
        data-testid="databutton-copy"
        className="w-12 h-12 relative inline-block text-grey-500 rounded active:text-blue-600 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-500 hover:bg-grey-50"
      >
        <CopyIcon
          aria-label="Copy"
          width="21"
          height="24"
          className="absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 fill-current"
        />
      </button>
    </FtlMsg>
  );
};

export const GetDataCopySingletonInline = ({
  value,
  onAction,
}: GetDataTrioProps) => {
  return (
    <FtlMsg id="get-data-trio-copy-2" attrs={{ title: true, ariaLabel: true }}>
      <button
        title="Copy"
        type="button"
        onClick={async () => {
          const copyValue = Array.isArray(value) ? value.join('\r\n') : value;
          await copy(copyValue);
          onAction?.('copy');
        }}
        data-testid="databutton-copy"
        className="-my-3 -me-4 p-3 rounded text-grey-500 bg-transparent border border-transparent hover:bg-grey-100 active:bg-grey-200 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-500 focus:bg-grey-50"
      >
        <InlineCopyIcon
          aria-label="Copy"
          className="w-6 h-6 items-center justify-center stroke-current"
        />
      </button>
    </FtlMsg>
  );
};

const recoveryCodesPrintTemplate = (
  recoveryCodes: string | string[],
  title: string
) => {
  if (typeof recoveryCodes === 'string') recoveryCodes = [recoveryCodes];
  return `
    <html>
    <head><title>${title}</title></head>
    <body>
    ${recoveryCodes.map((code: string) => `<p>${code}</p>`).join('')}
    </body>
    </html>
  `;
};

export const GetDataTrio = ({
  value,
  contentType,
  onAction,
}: GetDataTrioProps) => {
  const ftlMsgResolver = useFtlMsgResolver();

  // Fall back to 'Firefox' just in case.
  if (contentType == null) {
    contentType = 'Firefox';
  }

  const pageTitleId = DownloadContentTypeL10nMapping[contentType];

  const pageTitle = ftlMsgResolver.getMsg(pageTitleId, contentType);

  const print = useCallback(() => {
    const printWindow = window.open('', 'Print', 'height=600,width=800')!;
    printWindow.document.write(recoveryCodesPrintTemplate(value, pageTitle));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }, [value, pageTitle]);
  const { primaryEmail } = useAccount();

  return (
    <div className="flex justify-between w-4/5 max-w-48">
      <FtlMsg
        id="get-data-trio-download-2"
        attrs={{ title: true, ariaLabel: true }}
      >
        <a
          title="Download"
          href={URL.createObjectURL(
            new Blob(Array.isArray(value) ? [value.join('\r\n')] : [value], {
              type: 'text/plain',
            })
          )}
          download={`${primaryEmail.email} ${contentType}.txt`}
          data-testid="databutton-download"
          className="w-12 h-12 relative inline-block text-grey-500 rounded active:text-blue-600 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-500 hover:bg-grey-50"
          onClick={() => onAction?.('download')}
        >
          <DownloadIcon
            aria-label="Download"
            height="24"
            width="18"
            className="absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 fill-current"
          />
        </a>
      </FtlMsg>

      <GetDataCopySingleton {...{ onAction, value }} />

      {/** This only opens the page that is responsible
       *   for triggering the print screen.
       **/}
      <FtlMsg
        id="get-data-trio-print-2"
        attrs={{ title: true, ariaLabel: true }}
      >
        <button
          title="Print"
          type="button"
          onClick={() => {
            print();
            onAction?.('print');
          }}
          data-testid="databutton-print"
          className="w-12 h-12 relative inline-block text-grey-500 rounded active:text-blue-600 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-500 hover:bg-grey-50"
        >
          <PrintIcon
            aria-label="Print"
            height="24"
            width="24"
            className="absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 fill-current"
          />
        </button>
      </FtlMsg>
    </div>
  );
};

export default GetDataTrio;
