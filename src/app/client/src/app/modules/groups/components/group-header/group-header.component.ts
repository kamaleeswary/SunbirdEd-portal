import { actions } from './../../interfaces/group';
import { Router, ActivatedRoute } from '@angular/router';
import { Component, ViewChild, Input, Renderer2, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { ResourceService, NavigationHelperService, ToasterService } from '@sunbird/shared';
import { MY_GROUPS, GROUP_DETAILS, IGroupCard, EDIT_GROUP } from './../../interfaces';
import { GroupsService } from '../../services';
import * as _ from 'lodash-es';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '@sunbird/core';
@Component({
  selector: 'app-group-header',
  templateUrl: './group-header.component.html',
  styleUrls: ['./group-header.component.scss']
})
export class GroupHeaderComponent implements OnInit, OnDestroy {
  dropdownContent = true;
  @ViewChild('modal') modal;
  @Input() groupData: IGroupCard;
  @Output() handleFtuModal = new EventEmitter();
  @Output() updateEvent = new EventEmitter();
  showModal = false;
  showEditModal: boolean;
  creator: string;
  showLeaveGroupModal = false;
  showLoader = false;
  public modalTitle: string;
  public modalMsg: string;
  public modalName: string;
  private unsubscribe$ = new Subject<void>();

  constructor(private renderer: Renderer2, public resourceService: ResourceService, private router: Router,
    private groupService: GroupsService, private navigationHelperService: NavigationHelperService, private toasterService: ToasterService,
    private activatedRoute: ActivatedRoute, private userService: UserService) {
    this.renderer.listen('window', 'click', (e: Event) => {
      if (e.target['tabIndex'] === -1 && e.target['id'] !== 'group-actions') {
        this.dropdownContent = true;
      }
    });
  }

  ngOnInit () {
    this.creator = _.capitalize(_.get(_.find(this.groupData['members'], {userId: this.groupData['createdBy']}), 'name'));
    this.groupService.showMenu.subscribe(data => {
      this.dropdownContent = data !== 'group';
    });
    this.groupService.showActivateModal.subscribe(name => {
      this.toggleModal(true, name);
    });
  }

  navigateToPreviousPage() {
    setTimeout(() => {
      this.showLoader = false;
      this.goBack();
    }, 1500);
  }

  editGroup() {
    this.router.navigate([`${MY_GROUPS}/${GROUP_DETAILS}`, _.get(this.groupData, 'id'), EDIT_GROUP]);
  }

  goBack() {
    this.navigationHelperService.goBack();
  }

  dropdownMenu() {
    this.dropdownContent = !this.dropdownContent;
  }

  toggleFtuModal(visibility: boolean = false) {
    this.handleFtuModal.emit(visibility);
  }

  addTelemetry(id) {
    this.groupService.addTelemetry(id, this.activatedRoute.snapshot, []);
  }

  toggleModal(visibility = false, name?: string) {
    this.showModal = visibility;
    this.groupService.emitMenuVisibility('group');
    this.modalName = name;
    switch (name) {
      case actions.DELETE:
        this.assignModalStrings(this.resourceService.frmelmnts.lbl.deleteGroup, this.resourceService.messages.imsg.m0082, '{group name}');
        break;
      case actions.DEACTIVATE:
        this.assignModalStrings(this.resourceService.frmelmnts.lbl.deactivategrpques, this.resourceService.frmelmnts.msg.deactivategrpmsg);
        break;
      case actions.ACTIVATE:
        this.assignModalStrings(this.resourceService.frmelmnts.lbl.activategrpques, this.resourceService.frmelmnts.msg.activategrppopup);
        break;
    }
  }


  assignModalStrings(title, msg, replaceStr?) {
    this.modalTitle = title;
    this.modalMsg = replaceStr ? msg.replace(replaceStr, this.groupData.name) : msg;
  }

  handleEvent(event) {
    this.showModal = false;
    this.showLoader = !_.isEmpty(event);
    switch (event) {
      case actions.DELETE:
        this.deleteGroup();
        break;
      case actions.DEACTIVATE:
        this.deActivateGroup();
        break;
      case actions.ACTIVATE:
        this.activateGroup();
        break;
    }
  }

  leaveGroup() {
    this.showLoader = true;
    /* istanbul ignore else */
    if (!this.groupService.isCurrentUserCreator) {
      this.groupService.removeMembers(this.groupData.id, [this.userService.userid])
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe(resp => {
          this.showLoader = false;
          this.toasterService.success(this.resourceService.messages.smsg.leaveGroup);
          this.goBack();
        }, error => {
          this.showLoader = false;
          this.toasterService.error(this.resourceService.messages.emsg.leaveGroup);
        });
    }
    // TODO: leave group API integration and add telemetry
  }

  deleteGroup() {
      this.groupService.deleteGroupById(_.get(this.groupData, 'id')).pipe(takeUntil(this.unsubscribe$)).subscribe(data => {
        this.toasterService.success(this.resourceService.messages.smsg.m002);
        this.navigateToPreviousPage();
      }, err => {
        this.toasterService.error(this.resourceService.messages.emsg.m003);
        this.navigateToPreviousPage();
      });
  }

  deActivateGroup() {
    this.groupService.deActivateGroupById(_.get(this.groupData, 'id')).pipe(takeUntil(this.unsubscribe$)).subscribe(data => {
      this.toasterService.success(this.resourceService.frmelmnts.msg.deactivategrpsuccess);
      this.showLoader = false;
      this.updateEvent.emit();
    }, err => {
      this.showLoader = false;
      this.toasterService.error(this.resourceService.frmelmnts.msg.deactivategrpfailed);
    });
  }

  activateGroup() {
    this.groupService.activateGroupById(_.get(this.groupData, 'id')).pipe(takeUntil(this.unsubscribe$)).subscribe(data => {
      this.toasterService.success(this.resourceService.frmelmnts.msg.activategrpsuccess);
      this.showLoader = false;
      this.updateEvent.emit();
    }, err => {
      this.showLoader = false;
      this.toasterService.error(this.resourceService.frmelmnts.msg.activategrpfailed);
    });
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}
