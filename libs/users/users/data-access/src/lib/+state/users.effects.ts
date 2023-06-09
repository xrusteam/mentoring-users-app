import { inject } from '@angular/core';
import { createEffect, Actions, ofType } from '@ngrx/effects';
import { switchMap, catchError, of, map, withLatestFrom, filter, Observable } from 'rxjs';
import * as UsersActions from './users.actions';
import { ApiService } from '@users/core/http';
import { CreateUserDTO, UsersDTO } from '../users-dto.model';
import { usersDTOAdapter } from '../users-dto.adapter';
import { Store, select } from '@ngrx/store';
import { selectOpenedUser, selectUsersEntities } from './users.selectors';
import { UsersEntity } from './users.entity';
import { selectRouteParams } from '@users/core/data-access';

export const userEffects = createEffect(
  () => {
    const actions$ = inject(Actions);
    const apiService = inject(ApiService);

    actions$.subscribe(console.log)

    return actions$.pipe(
      ofType(UsersActions.initUsers),
      switchMap(
        () => apiService.get<UsersDTO[]>('/users').pipe(
          map(
            (users) => UsersActions.loadUsersSuccess({
              users: users.map(user => usersDTOAdapter.DTOtoEntity(user))
            })
          ),
          catchError((error) => {
            console.error('Error', error);
            return of(UsersActions.loadUsersFailure({ error }));
          })
        )
      ),
    )
  }, { functional: true }
)

export const deleteUser = createEffect(
  () => {
    const actions$ = inject(Actions);
    const apiService = inject(ApiService);
    return actions$.pipe(
      ofType(UsersActions.deleteUser),
      switchMap(
        ({ id }) => apiService.delete<void>(`/users/${id}`).pipe(
          map(() => UsersActions.deleteUserSuccess({ id })),
          catchError((error) => {
            console.error('Error', error);
            return of(UsersActions.deleteUserFailed({ error }))
          })
        )
      ),
    )
  }, { functional: true }
)

export const addUser = createEffect(
  () => {
    const actions$ = inject(Actions);
    const apiService = inject(ApiService);
    return actions$.pipe(
      ofType(UsersActions.addUser),
      switchMap(
        ({ userData }) => apiService.post<UsersDTO, CreateUserDTO>('/users', userData).pipe(
          map((user) => UsersActions.addUserSuccess({ userData: user })),
          catchError((error) => {
            console.error('Error', error);
            return of(UsersActions.addUserFailed({ error }))
          })
        )))
  }, { functional: true }
)

export const editUser = createEffect(
  () => {
    const actions$ = inject(Actions);
    const apiService = inject(ApiService);
    const usersEntities$ = inject(Store).pipe(select(selectUsersEntities));

    return actions$.pipe(
      ofType(UsersActions.editUser),
      withLatestFrom(usersEntities$),
      filter(([{ id }, usersEntities]) => Boolean(usersEntities[id])),
      // map(([{userData, id}, usersEntities]) => ({
      //   ...usersDTOAdapter.entityToDTO(<UsersEntity>usersEntities[id]),
      //   name: userData.name,
      //   email: userData.email
      // })),
      map(([editUserPayload, usersEntities]) => {
        const idUserToEdit = editUserPayload.id;
        const usersEntityToEdit = <UsersEntity>usersEntities[idUserToEdit];
        const dtoUser = usersDTOAdapter.entityToDTO(usersEntityToEdit);
        const dtoToUpdateUser = {
          ...dtoUser,
          name: editUserPayload.userData.name,
          email: editUserPayload.userData.email
        }

        return dtoToUpdateUser;
      }),
      switchMap(
        (user) => apiService.post<UsersDTO, UsersDTO>(`/users/${user.id}`, user).pipe(
          map((userData) => UsersActions.editUserSuccess({ userData })),
          catchError((error) => {
            console.error('Error', error);
            return of(UsersActions.editUserFailed({ error }))
          })
        )
      )
    )
  }, { functional: true }
)

export const loadUser = createEffect(
  () => {
    const actions$ = inject(Actions);
    const apiService = inject(ApiService);
    const store = inject(Store);
    return actions$.pipe(
      ofType(UsersActions.loadUser),
      withLatestFrom(store.select(selectRouteParams)),
      switchMap(
        ([, params]) => {
          if (params['id']) {
            return apiService.get<UsersDTO>(`/users/${params['id']}`)
              .pipe(
                map((userData) => UsersActions.loadUserSuccess({ userData })),
                catchError((error) => {
                  console.error('Error', error);
                  return of(UsersActions.loadUserFailed({ error }))
                })
              )
          }
          return of(UsersActions.loadUserFailed({ error: 'User not found' }));
        }
      )
    )
  }, { functional: true }
)