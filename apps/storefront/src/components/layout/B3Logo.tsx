import { useContext } from 'react';
import { Box, ImageListItem, ListItem, Typography } from '@mui/material';

import { STORE_DEFAULT_LOGO } from '@/constants';
import { useMobile } from '@/hooks';
import { GlobalContext } from '@/shared/global';
import { useAppSelector } from '@/store';

export default function B3Logo() {
  const {
    state: { logo },
  } = useContext(GlobalContext);
  const customer = useAppSelector(({ company }) => company.customer);
  const companyInfoName = useAppSelector(({ company }) => company.companyInfo.companyName);

  const [isMobile] = useMobile();

  return (
    <Box
      sx={
        isMobile
          ? {
              height: '40px',
              width: '140px',
              '& li': {
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '1rem',
              },
              '& img': {
                maxHeight: '40px',
              },
            }
          : {
              width: '200px',
              height: '65px',
              display: 'flex',
              alignItems: 'center',
              '& img': {
                maxHeight: '65px',
              },
            }
      }
    >
      <ImageListItem
        sx={{
          maxWidth: '200px',
          cursor: 'pointer',
          '& .MuiImageListItem-img': {
            objectFit: 'contain',
            width: 'auto',
          },
        }}
        onClick={() => {
          window.location.href = '/';
        }}
      >
        <img src={logo || STORE_DEFAULT_LOGO} alt="logo" />
      </ImageListItem>
      <ListItem sx={{ml: 12}}>
        <Typography>{customer.companyRoleName}</Typography>
      </ListItem>
      <ListItem>
        <Typography>{companyInfoName}</Typography>
      </ListItem>
    </Box>
  );
}
