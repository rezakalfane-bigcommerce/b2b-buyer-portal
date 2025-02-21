import { useContext, useEffect } from 'react';

import { DynamicallyVariableContext } from '@/shared/dynamicallyVariable';
import { GlobalContext } from '@/shared/global';

const { height: defaultHeight, overflow: defaultOverflow } = document.body.style;

const useSetOpen = (isOpen: boolean, isEmbedded: boolean, params?: CustomFieldItems) => {
  const { dispatch } = useContext(GlobalContext);

  const { dispatch: dispatchMsg } = useContext(DynamicallyVariableContext);
  useEffect(() => {
    if (isOpen) {
      // The iframe button opens and assigns the url
      dispatch({
        type: 'common',
        payload: {
          openAPPParams: {
            quoteBtn: params?.quoteBtn || '',
            shoppingListBtn: params?.shoppingListBtn || '',
          },
        },
      });

      // close all global tips
      dispatchMsg({
        type: 'common',
        payload: {
          globalTipMessage: {
            msgs: [],
          },
          tipMessage: {
            msgs: [],
          },
        },
      });
    } else {
      // close all tips
      dispatchMsg({
        type: 'common',
        payload: {
          tipMessage: {
            msgs: [],
          },
        },
      });
    }

    if (!isEmbedded) {
      if (isOpen) {
        // The iframe screen is removed
        document.body.style.height = '100%';
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.height = defaultHeight;
        document.body.style.overflow = defaultOverflow;
      }
    }
    // ignore dispatch and dispatchMsg as they are not reactive values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isEmbedded, params?.quoteBtn, params?.shoppingListBtn]);
};

export default useSetOpen;
