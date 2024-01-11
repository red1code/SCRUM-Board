import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { Task } from './task/task';
import { MatDialog }from '@angular/material/dialog';
import { TaskDialogComponent, TaskDialogResult } from './task-dialog/task-dialog.component';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';

const getObservable = (collection: AngularFirestoreCollection<Task>) => {
  const subject = new BehaviorSubject([]);
  collection.valueChanges({ idField: 'id' }).subscribe((val: Task[]) => {
    subject.next(val);
  });
  return subject;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  todo = getObservable(this.store.collection('todo', ref => ref.orderBy('lastUpdate')));
  inProgress = getObservable(this.store.collection('inProgress', ref => ref.orderBy('lastUpdate')));
  done = getObservable(this.store.collection('done', ref => ref.orderBy('lastUpdate', 'desc')));

  constructor(private dialog: MatDialog, private store: AngularFirestore) {}

  drop(event: CdkDragDrop<Task[]>):void {
    if (event.previousContainer === event.container) {
      return;
    }
    const item = event.previousContainer.data[event.previousIndex];
    this.store.firestore.runTransaction(() => {
      return Promise.all([
        this.store.collection(event.previousContainer.id).doc(item.id).delete(),
        this.store.collection(event.container.id).add(item)
      ]);
    });
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
  }

  edit(list: 'done' | 'todo' | 'inProgress', task: Task): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '270px',
      data: {
        task,
        enableDelete: true
      }
    });
    dialogRef.afterClosed().subscribe((result: TaskDialogResult) => {
      if (result.delete) {
        this.deleteDoc(list, task.id)
      } else {
        this.store.collection(list).doc(task.id).update(task);
      }
    });
  }

  newTask(): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '270px',
      data: {
        task: {}
      }
    });
    dialogRef.afterClosed().subscribe((result: TaskDialogResult) => this.store.collection('todo').add(result.task));
  }

  private deleteDoc(list: "done" | "todo" | "inProgress", id: string) {
    if (confirm('Are you sure you wanna delete this?')) {
      this.store.collection(list).doc(id).delete();
    }
  }
}
