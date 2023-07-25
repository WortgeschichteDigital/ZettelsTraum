"use strict";

const tooltip = {
  // timeout to defer the visibility of the tooltip
  defer: undefined,

  // do not defer the visibility of the tooltip
  noDefer: false,

  // current target element
  target: null,

  // interval to observe the current target
  observe: undefined,

  // z-index of tooltip
  zIndex: 99,

  // initialize tooltip
  //   basis = node | undefined
  init (basis = document) {
    basis.querySelectorAll("[title]").forEach(i => {
      let title = i.title;
      const repMap = new Map([
        [ /(?<!<)\//g, "/<wbr>" ],
        [ / \+ /g, "\u00A0+\u00A0" ],
      ]);
      for (const [ reg, rep ] of repMap.entries()) {
        title = title.replace(reg, rep);
      }
      i.dataset.tooltip = title;
      i.removeAttribute("title");
      if (!i.dataset.tooltip) {
        return;
      }
      i.addEventListener("mouseover", function () {
        clearTimeout(tooltip.defer);
        clearInterval(tooltip.observe);
        const timeout = tooltip.noDefer ? 0 : 500;
        tooltip.defer = setTimeout(() => {
          // show tooltip
          tooltip.on(this);

          // remove tooltip if target is gone
          tooltip.target = this;
          tooltip.observe = setInterval(() => {
            if (tooltip.target && (!tooltip.target.closest("body") || tooltip.target.closest(".aus"))) {
              clearInterval(tooltip.observe);
              tooltip.off();
            }
          }, 50);
        }, timeout);
      });
      i.addEventListener("mouseout", () => tooltip.off());
      if (i === tooltip.target) {
        tooltip.noDefer = true;
        i.dispatchEvent(new Event("mouseover"));
        tooltip.noDefer = false;
      }
    });
  },

  // show tooltip
  //   ele = node (on which the mouse hovers)
  on (ele) {
    let tip = document.querySelector("#tooltip");

    // create tooltip (if needed)
    if (!tip) {
      const div = document.createElement("div");
      div.id = "tooltip";
      tip = div;
      document.body.appendChild(div);
    }

    // Wide tooltip?
    if (ele.dataset.tooltip.length > 150) {
      tip.classList.add("wide");
    } else {
      tip.classList.remove("wide");
    }

    // fill tooltip
    tip.innerHTML = ele.dataset.tooltip;

    // position tooltip
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    const rect = ele.getBoundingClientRect();
    let top = rect.bottom + 5;
    if (top + height > window.innerHeight - 20) {
      top = rect.top - 5 - height;
    }
    tip.style.top = top + "px";
    let left = rect.left + Math.round(rect.width / 2) - Math.round(tip.offsetWidth / 2);
    if (ele.nodeName === "P") {
      ({ left } = rect);
    } else if (left + width > window.innerWidth - 10) {
      left = rect.right - width;
    } else if (left < 10) {
      ({ left } = rect);
    }
    tip.style.left = left + "px";
    if (typeof overlay !== "undefined") {
      tooltip.zIndex = overlay.zIndex;
    }
    tip.style.zIndex = ++tooltip.zIndex;
    tip.classList.add("visible");
  },

  // Tooltip ausblenden
  off () {
    clearTimeout(tooltip.defer);
    clearInterval(tooltip.observe);
    const tip = document.querySelector("#tooltip");
    if (!tip) {
      return;
    }
    tip.addEventListener("transitionend", function () {
      if (!this.parentNode) {
        return;
      }
      this.parentNode.removeChild(this);
    }, { once: true });
    tip.classList.remove("visible");
    tooltip.target = null;
  },
};
