import { Component, Input } from '@angular/core';

/** Bundled inline-SVG icon set (Feather-style, MIT). No CDN. stroke=currentColor. */
@Component({
  selector: 'app-icon',
  standalone: true,
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
  styles: [':host { display: inline-flex; line-height: 0; }'],
})
export class IconComponent {
  @Input() name = '';
  @Input() size = 20;
  @Input() filled = false;
}
